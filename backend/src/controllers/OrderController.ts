/**
 * Order Controller
 * 
 * Handles order creation (checkout) and retrieval.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { orderService } from '../services/OrderService';
import { cartService } from '../services/CartService';
import { razorpayService } from '../services/RazorpayService';
import { mongo } from '../db/Mongo';
import { AuditLog } from '../types';
import { Config } from '../config/Config';
import * as crypto from 'crypto';

const checkoutSchema = z.object({
  payment_method: z.enum(['razorpay', 'cod', 'other']),
  shipping_address: z.object({
    name: z.string().min(1),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(1),
    country: z.string().min(1),
    phone: z.string().optional(),
  }),
  billing_address: z.object({
    name: z.string().min(1),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(1),
    country: z.string().min(1),
    phone: z.string().optional(),
  }).optional(),
});

export class OrderController {
  /**
   * POST /api/checkout
   * Create order from cart
   */
  static async checkout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const validated = checkoutSchema.parse(req.body);
      
      // Get user's cart
      const cart = await cartService.getCart(req.userId, req.sessionId);
      if (!cart || cart.items.length === 0) {
        res.status(400).json({
          ok: false,
          error: 'Cart is empty',
        });
        return;
      }
      
      // Create order
      const billingAddress = validated.billing_address || validated.shipping_address;
      const result = await orderService.createOrder(
        req.userId,
        cart,
        validated.shipping_address,
        billingAddress,
        validated.payment_method
      );
      
      // Log audit event
      await OrderController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'order.create',
        objectType: 'order',
        objectId: result.order._id,
        metadata: {
          amount: result.order.amount,
          paymentMethod: validated.payment_method,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(201).json({
        ok: true,
        data: {
          order: result.order,
          payment: result.payment,
          nextSteps: {
            payment: validated.payment_method === 'razorpay' 
              ? 'Redirect to Razorpay checkout' 
              : 'Payment on delivery',
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      
      console.error('Checkout error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Checkout failed',
      });
    }
  }

  /**
   * GET /api/orders/:id
   * Get order details
   * Users can only view their own orders, admins can view any order
   */
  static async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const userId = req.userId;
      const isAdmin = (req.user as any)?.role === 'admin';
      
      // If not admin, restrict to user's own orders
      const orderUserId = isAdmin ? undefined : userId;
      
      const order = await orderService.getOrderById(orderId, orderUserId);
      
      if (!order) {
        res.status(404).json({
          ok: false,
          error: 'Order not found',
        });
        return;
      }
      
      // Get payment info
      const db = mongo.getDb();
      const paymentsCollection = db.collection('payments');
      const payment = await paymentsCollection.findOne({ orderId });
      
      res.json({
        ok: true,
        data: {
          ...order,
          payment: payment || null,
        },
      });
    } catch (error) {
      console.error('Error getting order:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch order',
      });
    }
  }

  /**
   * POST /api/checkout/create-order
   * Step 1: Create order from cart (saves order to database)
   */
  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const validated = checkoutSchema.parse(req.body);
      
      // Get user's cart
      const cart = await cartService.getCart(req.userId, req.sessionId);
      if (!cart || cart.items.length === 0) {
        res.status(400).json({
          ok: false,
          error: 'Cart is empty',
        });
        return;
      }
      
      // Create order (without payment for now)
      const billingAddress = validated.billing_address || validated.shipping_address;
      const result = await orderService.createOrderWithoutPayment(
        req.userId,
        cart,
        validated.shipping_address,
        billingAddress,
        validated.payment_method
      );
      
      // Log audit event
      await OrderController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'order.create',
        objectType: 'order',
        objectId: result.order._id,
        metadata: {
          amount: result.order.amount,
          paymentMethod: validated.payment_method,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(201).json({
        ok: true,
        data: {
          orderId: result.order._id,
          amount: result.order.amount,
          currency: result.order.currency,
          payment_method: validated.payment_method,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      
      console.error('Create order error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      });
    }
  }

  /**
   * POST /api/checkout/create-razorpay-order
   * Step 2: Create Razorpay order for payment
   */
  static async createRazorpayOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const schema = z.object({
        orderId: z.string().min(1),
      });
      const validated = schema.parse(req.body);

      // Get order and verify ownership
      const order = await orderService.getOrderById(validated.orderId, req.userId);
      if (!order) {
        res.status(404).json({
          ok: false,
          error: 'Order not found',
        });
        return;
      }

      // Check if order already has Razorpay order ID
      if (order.razorpayOrderId) {
        const keyId = Config.get('RAZORPAY_KEY_ID', '');
        res.json({
          ok: true,
          data: {
            razorpay_order_id: order.razorpayOrderId,
            key_id: keyId,
          },
        });
        return;
      }

      // Create Razorpay order
      const razorpayOrder = await razorpayService.createOrder({
        amount: order.amount,
        currency: order.currency,
        receipt: order._id,
        notes: {
          orderId: order._id,
          userId: order.userId,
        },
      });

      // Update order with Razorpay order ID
      const db = mongo.getDb();
      const ordersCollection = db.collection('orders');
      await ordersCollection.updateOne(
        { _id: new ObjectId(order._id) },
        {
          $set: {
            razorpayOrderId: razorpayOrder.id,
            updatedAt: new Date(),
          },
        }
      );

      const keyId = Config.get('RAZORPAY_KEY_ID', '');

      res.json({
        ok: true,
        data: {
          razorpay_order_id: razorpayOrder.id,
          key_id: keyId,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      console.error('Create Razorpay order error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create Razorpay order',
      });
    }
  }

  /**
   * POST /api/checkout/confirm-razorpay
   * Step 3: Verify and confirm Razorpay payment
   */
  static async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const schema = z.object({
        orderId: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_order_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
      });
      const validated = schema.parse(req.body);

      // Get order and verify ownership
      const order = await orderService.getOrderById(validated.orderId, req.userId);
      if (!order) {
        res.status(404).json({
          ok: false,
          error: 'Order not found',
        });
        return;
      }

      // Verify signature
      const keySecret = Config.get('RAZORPAY_KEY_SECRET', '');
      const text = `${validated.razorpay_order_id}|${validated.razorpay_payment_id}`;
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(text)
        .digest('hex');

      if (generatedSignature !== validated.razorpay_signature) {
        res.status(400).json({
          ok: false,
          error: 'Invalid payment signature',
        });
        return;
      }

      // Get payment details from Razorpay
      const payment = await razorpayService.getPayment(validated.razorpay_payment_id);

      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        res.status(400).json({
          ok: false,
          error: `Payment not successful. Status: ${payment.status}`,
        });
        return;
      }

      // Update order and payment records
      const db = mongo.getDb();
      const ordersCollection = db.collection('orders');
      const paymentsCollection = db.collection('payments');

      // Update order status
      await ordersCollection.updateOne(
        { _id: new ObjectId(order._id) },
        {
          $set: {
            status: 'paid',
            updatedAt: new Date(),
          },
        }
      );

      // Create or update payment record
      const existingPayment = await paymentsCollection.findOne({ orderId: validated.orderId });
      if (existingPayment) {
        await paymentsCollection.updateOne(
          { _id: existingPayment._id },
          {
            $set: {
              gateway: 'razorpay',
              gateway_order_id: validated.razorpay_order_id,
              gateway_payment_id: validated.razorpay_payment_id,
              status: 'completed',
              meta: {
                ...existingPayment.meta,
                razorpay_payment: payment,
              },
              updatedAt: new Date(),
            },
          }
        );
      } else {
        await paymentsCollection.insertOne({
          orderId: validated.orderId,
          amount: order.amount,
          currency: order.currency,
          gateway: 'razorpay',
          gateway_order_id: validated.razorpay_order_id,
          gateway_payment_id: validated.razorpay_payment_id,
          status: 'completed',
          meta: {
            razorpay_payment: payment,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Log audit event
      await OrderController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'payment.confirm',
        objectType: 'order',
        objectId: validated.orderId,
        metadata: {
          paymentId: validated.razorpay_payment_id,
          amount: order.amount,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Update order status in service (triggers email)
      await orderService.updateOrderStatus(validated.orderId, 'paid');

      res.json({
        ok: true,
        data: {
          orderId: validated.orderId,
          paymentStatus: 'completed',
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      console.error('Confirm payment error:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment',
      });
    }
  }

  /**
   * Helper: Log audit event
   */
  private static async logAudit(log: Omit<AuditLog, '_id' | 'createdAt'>): Promise<void> {
    try {
      const db = mongo.getDb();
      const auditLogsCollection = db.collection<AuditLog>('audit_logs');
      
      await auditLogsCollection.insertOne({
        ...log,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}


/**
 * Order Controller
 * 
 * Handles order creation (checkout) and retrieval.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { orderService } from '../services/OrderService';
import { cartService } from '../services/CartService';
import { mongo } from '../db/Mongo';
import { AuditLog } from '../types';

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


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
import { settingsService } from '../services/SettingsService';
import { platformSettingsService } from '../services/PlatformSettingsService';
import { parsePagination, getPaginationMeta } from '../helpers/pagination';
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
  shipping_method: z.string().optional(),
  shipping_cost: z.number().min(0).optional(),
  email: z.string().email().optional(), // For guest checkout
  couponCode: z.string().optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
  giftWrap: z.boolean().optional(),
});

export class OrderController {
  /**
   * POST /api/checkout
   * Create order from cart
   */
  static async checkout(req: Request, res: Response): Promise<void> {
    try {
      const validated = checkoutSchema.parse(req.body);
      
      // Check guest checkout feature flag
      const guestCheckoutEnabled = await settingsService.isFeatureEnabled('checkout.guestEnabled');
      
      // If not authenticated, check if guest checkout is enabled
      if (!req.userId) {
        if (!guestCheckoutEnabled) {
          res.status(401).json({
            ok: false,
            error: 'Authentication required',
          });
          return;
        }
        
        // Guest checkout requires email
        if (!validated.email) {
          res.status(400).json({
            ok: false,
            error: 'Email is required for guest checkout',
          });
          return;
        }
      }
      
      // Get cart (use sessionId for guest checkout)
      const cart = await cartService.getCart(req.userId, req.sessionId);
      if (!cart || cart.items.length === 0) {
        res.status(400).json({
          ok: false,
          error: 'Cart is empty',
        });
        return;
      }
      
      const payments = await platformSettingsService.getSection('payments');
      const paymentEnabled = payments.methods[validated.payment_method]?.enabled ?? false;
      if (!paymentEnabled) {
        res.status(400).json({
          ok: false,
          error: 'Selected payment method is not available right now. Please choose another option.',
        });
        return;
      }

      // Calculate discounts
      let couponDiscount = 0;
      let loyaltyDiscount = 0;
      let loyaltyPointsRedeemed = 0;
      
      // Validate and apply coupon if provided
      const couponsEnabled = await platformSettingsService.isFeatureEnabled('features.coupons.enabled');
      if (couponsEnabled && validated.couponCode) {
        const orderAmount = cart.items.reduce((sum, item) => sum + item.priceAt * item.qty, 0);
        const orderItems = cart.items.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          price: item.priceAt,
        }));
        
        const { couponService } = await import('../services/CouponService');
        const couponResult = await couponService.validateCoupon(
          validated.couponCode,
          req.userId,
          orderAmount,
          orderItems
        );
        
        if (couponResult.valid) {
          couponDiscount = couponResult.discount;
        }
      }
      
      // Validate and apply loyalty points if provided
      const loyaltyEnabled = await settingsService.isFeatureEnabled('loyalty.enabled');
      if (loyaltyEnabled && validated.loyaltyPoints && validated.loyaltyPoints > 0 && req.userId) {
        const orderAmount = cart.items.reduce((sum, item) => sum + item.priceAt * item.qty, 0);
        const { loyaltyService } = await import('../services/LoyaltyService');
        
        try {
          const loyaltyResult = await loyaltyService.redeemPoints(
            req.userId,
            '', // orderId will be set after order creation
            orderAmount,
            validated.loyaltyPoints
          );
          loyaltyDiscount = loyaltyResult.discountAmount;
          loyaltyPointsRedeemed = validated.loyaltyPoints;
        } catch (error) {
          // If loyalty redemption fails, continue without it
          console.warn('Loyalty redemption failed:', error);
        }
      }
      
      // Create order
      const billingAddress = validated.billing_address || validated.shipping_address;
      const result = await orderService.createOrder(
        req.userId || undefined, // Allow undefined for guest checkout
        cart,
        validated.shipping_address,
        billingAddress,
        validated.payment_method,
        {
          email: validated.email,
          couponCode: validated.couponCode,
          couponDiscount,
          loyaltyPointsRedeemed,
          loyaltyDiscount,
          giftWrap: validated.giftWrap || false,
        }
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
   * GET /api/orders
   * List user's orders
   */
  static async listOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const pagination = parsePagination(req.query);

      const { orders, total } = await orderService.listOrders({
        userId: req.userId,
        status: req.query.status as string | undefined,
        searchQuery: req.query.search as string | undefined,
        ...pagination,
      });
      const meta = getPaginationMeta(pagination, total);

      res.json({
        ok: true,
        data: {
          items: orders,
          total: meta.total,
          pages: meta.pages,
        },
      });
    } catch (error) {
      console.error('Error listing orders:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch orders',
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
      
      // Get tax rate and shipping cost from settings
      const taxShippingSettings = await platformSettingsService.getSection('taxShipping');
      const taxRate = taxShippingSettings.taxRate || 18;
      
      // Use shipping cost from request if provided, otherwise use default from settings
      const shippingCost = validated.shipping_cost !== undefined 
        ? validated.shipping_cost 
        : (validated.shipping_method ? taxShippingSettings.defaultShippingCost || 0 : 0);
      
      // Create order (without payment for now)
      const billingAddress = validated.billing_address || validated.shipping_address;
      console.log('DEBUG createOrder:', {
        userId: req.userId,
        hasCart: !!cart,
        cartItemsCount: cart.items.length
      });
      
      const result = await orderService.createOrderWithoutPayment(
        req.userId,
        cart,
        validated.shipping_address,
        billingAddress,
        validated.payment_method,
        {
          shippingMethod: validated.shipping_method,
          shippingCost,
          taxRate,
        }
      );
      
      console.log('DEBUG order created:', {
        orderId: result.order._id,
        orderUserId: result.order.userId
      });
      
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
   * GET /api/orders/:id/invoice
   * Download invoice for an order (user can only download their own invoices)
   */
  static async downloadInvoice(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const userId = req.userId;

      console.log('DEBUG downloadInvoice:', {
        orderId,
        userId,
        hasUserId: !!userId
      });

      if (!userId) {
        console.log('No userId in request');
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      // Verify user owns the order
      const order = await orderService.getOrderById(orderId, userId);
      console.log('DEBUG order lookup:', {
        orderFound: !!order,
        orderUserId: order?.userId,
        requestUserId: userId,
        match: order?.userId === userId
      });
      
      if (!order) {
        res.status(404).json({
          ok: false,
          error: 'Order not found or access denied',
        });
        return;
      }

      // Get invoice
      const { invoiceService } = await import('../services/InvoiceService');
      let invoice = await invoiceService.getInvoiceByOrderId(orderId);
      
      console.log('DEBUG invoice lookup:', {
        invoiceFound: !!invoice,
        invoiceId: invoice?._id,
        hasPdfPath: !!invoice?.pdfPath
      });

      // If invoice doesn't exist OR has no PDF, (re)generate it
      if (!invoice || !invoice.pdfPath) {
        if (invoice && !invoice.pdfPath) {
          console.log('Invoice exists but has no PDF. Deleting and regenerating...');
          // Delete the broken invoice so we can regenerate it properly
          await invoiceService.deleteInvoice(invoice._id as string);
        }
        
        console.log('Generating invoice for order:', orderId);
        invoice = await invoiceService.generateInvoice(orderId, 'manual');
        console.log('Invoice generated:', {
          invoiceId: invoice?._id,
          hasPdfPath: !!invoice?.pdfPath,
          pdfPath: invoice?.pdfPath
        });
      }

      if (!invoice.pdfPath) {
        console.log('Invoice STILL has no pdfPath after generation:', invoice);
        res.status(500).json({
          ok: false,
          error: 'Invoice PDF generation failed. Puppeteer may not be properly installed.',
        });
        return;
      }

      const fs = require('fs');
      const path = require('path');
      
      console.log('Checking PDF file existence:', {
        pdfPath: invoice.pdfPath,
        exists: fs.existsSync(invoice.pdfPath)
      });

      if (!fs.existsSync(invoice.pdfPath)) {
        console.log('PDF file does not exist at path:', invoice.pdfPath);
        res.status(404).json({
          ok: false,
          error: 'Invoice PDF file not found',
        });
        return;
      }
      
      console.log('PDF file found, sending response');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      res.sendFile(path.resolve(invoice.pdfPath));
    } catch (error) {
      console.error('Error downloading invoice:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        ok: false,
        error: 'Failed to download invoice',
        details: error instanceof Error ? error.message : String(error),
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


/**
 * Admin Refund Controller
 * 
 * Handles refund operations for admins.
 * Includes safety checks, refund window validation, and idempotency.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { RefundModel } from '../models/refunds';
import { razorpayService } from '../services/RazorpayService';
import { Config } from '../config/Config';
import { AuditLog } from '../types';

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(1, 'Reason is required'),
});

export class AdminRefundController {
  /**
   * POST /api/admin/orders/:id/refund
   * Create refund for an order
   */
  static async createRefund(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const validated = refundSchema.parse(req.body);
      
      const db = mongo.getDb();
      const ordersCollection = db.collection('orders');
      const paymentsCollection = db.collection('payments');
      const jobsCollection = db.collection('jobs');
      
      // Get order
      const orderObjId = new ObjectId(orderId);
      const order = await ordersCollection.findOne({ _id: orderObjId });
      
      if (!order) {
        res.status(404).json({
          ok: false,
          error: 'Order not found',
        });
        return;
      }
      
      // Check refund window
      const refundWindowDays = Config.int('REFUND_WINDOW_DAYS', 7);
      const orderDate = order.deliveredAt || order.placedAt || order.createdAt;
      const daysSinceOrder = (Date.now() - new Date(orderDate).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceOrder > refundWindowDays) {
        res.status(400).json({
          ok: false,
          error: `Refund window expired. Refunds allowed within ${refundWindowDays} days of delivery.`,
          code: 'REFUND_WINDOW_EXPIRED',
        });
        return;
      }
      
      // Get payment
      const payment = await paymentsCollection.findOne({ orderId });
      if (!payment) {
        res.status(404).json({
          ok: false,
          error: 'Payment not found',
        });
        return;
      }
      
      // Check if payment is refundable
      if (payment.status !== 'completed') {
        res.status(400).json({
          ok: false,
          error: 'Payment must be completed before refund',
          code: 'PAYMENT_NOT_COMPLETED',
        });
        return;
      }
      
      // Determine refund amount
      const refundAmount = validated.amount || payment.amount;
      
      // Check existing refunds (idempotency)
      const existingRefunds = await RefundModel.getByPaymentId(payment._id?.toString() || '');
      const totalRefunded = existingRefunds
        .filter(r => r.status === 'succeeded')
        .reduce((sum, r) => sum + r.amount, 0);
      
      if (totalRefunded + refundAmount > payment.amount) {
        res.status(400).json({
          ok: false,
          error: 'Refund amount exceeds payment amount',
          code: 'REFUND_AMOUNT_EXCEEDED',
        });
        return;
      }
      
      // Check for duplicate refund request (idempotency)
      const existingRefund = await RefundModel.findExistingRefund(
        payment._id?.toString() || '',
        refundAmount
      );
      
      if (existingRefund && existingRefund.status !== 'failed') {
        res.status(409).json({
          ok: false,
          error: 'Refund already requested for this amount',
          code: 'DUPLICATE_REFUND',
          data: existingRefund,
        });
        return;
      }
      
      // Create refund record
      const refund = await RefundModel.create({
        paymentId: payment._id?.toString() || '',
        orderId,
        amount: refundAmount,
        currency: payment.currency || 'INR',
        initiatedBy: req.userId!,
        status: 'requested',
        reason: validated.reason,
      });
      
      // Check if auto-capture refunds is enabled
      const autoCaptureRefunds = Config.bool('auto_capture_refunds', false);
      const razorpayEnabled = Config.bool('RAZORPAY_ENABLED', false);
      
      if (autoCaptureRefunds && razorpayEnabled && payment.gateway === 'razorpay' && payment.gateway_payment_id) {
        // Enqueue job to process refund via Razorpay
        await jobsCollection.insertOne({
          type: 'refund.process',
          payload: {
            refundId: refund._id,
            paymentId: payment.gateway_payment_id,
            amount: refundAmount,
          },
          status: 'pending',
          attempts: 0,
          maxAttempts: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Manual refund - just mark as requested
        // Admin will process manually
      }
      
      // Log audit event
      await AdminRefundController.logAudit({
        actorId: req.userId!,
        actorType: 'user',
        action: 'refund.create',
        objectType: 'refund',
        objectId: refund._id!,
        metadata: {
          orderId,
          amount: refundAmount,
          reason: validated.reason,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(201).json({
        ok: true,
        data: refund,
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
      
      console.error('Error creating refund:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to create refund',
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


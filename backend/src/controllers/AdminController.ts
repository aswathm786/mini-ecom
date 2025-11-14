/**
 * Admin Controller
 * 
 * Handles admin-only operations: product CRUD, order management, refunds.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { productService } from '../services/ProductService';
import { inventoryService } from '../services/InventoryService';
import { orderService } from '../services/OrderService';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { AuditLog } from '../types';
import { parsePagination, getPaginationMeta } from '../helpers/pagination';

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  qty: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

const updateProductSchema = createProductSchema.partial();

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(1),
});

export class AdminController {
  /**
   * POST /api/admin/products
   * Create a new product
   */
  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const validated = createProductSchema.parse(req.body);
      const files = req.files as Express.Multer.File[] || [];
      
      const product = await productService.createProduct({
        ...validated,
        images: files,
      });
      
      // Set inventory if provided
      if (validated.qty !== undefined) {
        await inventoryService.setInventory(
          product._id!,
          validated.qty,
          validated.lowStockThreshold || 10
        );
      }
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId!,
        actorType: 'user',
        action: 'product.create',
        objectType: 'product',
        objectId: product._id,
        metadata: { name: product.name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(201).json({
        ok: true,
        data: product,
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
      
      console.error('Error creating product:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create product',
      });
    }
  }

  /**
   * PUT /api/admin/products/:id
   * Update a product
   */
  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      const validated = updateProductSchema.parse(req.body);
      const files = req.files as Express.Multer.File[] || [];
      
      const product = await productService.updateProduct(productId, {
        ...validated,
        images: files.length > 0 ? files : undefined,
        removeImages: req.body.removeImages 
          ? (Array.isArray(req.body.removeImages) ? req.body.removeImages : [req.body.removeImages])
          : undefined,
      });
      
      if (!product) {
        res.status(404).json({
          ok: false,
          error: 'Product not found',
        });
        return;
      }
      
      // Update inventory if provided
      if (validated.qty !== undefined) {
        await inventoryService.setInventory(
          productId,
          validated.qty,
          validated.lowStockThreshold || 10
        );
      }
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId!,
        actorType: 'user',
        action: 'product.update',
        objectType: 'product',
        objectId: productId,
        metadata: { name: product.name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        data: product,
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
      
      console.error('Error updating product:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update product',
      });
    }
  }

  /**
   * DELETE /api/admin/products/:id
   * Delete a product (soft delete by default)
   */
  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.id;
      const hardDelete = req.query.hard === 'true';
      
      const success = await productService.deleteProduct(productId, hardDelete);
      
      if (!success) {
        res.status(404).json({
          ok: false,
          error: 'Product not found',
        });
        return;
      }
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId!,
        actorType: 'user',
        action: hardDelete ? 'product.delete' : 'product.deactivate',
        objectType: 'product',
        objectId: productId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        message: hardDelete ? 'Product deleted' : 'Product deactivated',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to delete product',
      });
    }
  }

  /**
   * GET /api/admin/orders
   * List orders with filters
   */
  static async listOrders(req: Request, res: Response): Promise<void> {
    try {
      const pagination = parsePagination(req.query);
      
      const filters = {
        userId: req.query.userId as string | undefined,
        status: req.query.status as string | undefined,
        ...pagination,
      };
      
      const { orders, total } = await orderService.listOrders(filters);
      
      res.json({
        ok: true,
        data: orders,
        meta: getPaginationMeta(pagination, total),
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
   * POST /api/admin/orders/:id/refund
   * Create refund request
   */
  static async createRefund(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const validated = refundSchema.parse(req.body);
      
      // Get order and payment
      const db = mongo.getDb();
      const ordersCollection = db.collection('orders');
      const paymentsCollection = db.collection('payments');
      const refundsCollection = db.collection('refunds');
      
      const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
      if (!order) {
        res.status(404).json({
          ok: false,
          error: 'Order not found',
        });
        return;
      }
      
      const payment = await paymentsCollection.findOne({ orderId });
      if (!payment) {
        res.status(404).json({
          ok: false,
          error: 'Payment not found',
        });
        return;
      }
      
      // Create refund record
      const refundAmount = validated.amount || payment.amount;
      const refund = {
        paymentId: payment._id?.toString(),
        orderId,
        amount: refundAmount,
        initiatedBy: req.userId!,
        status: 'requested',
        reason: validated.reason,
        createdAt: new Date(),
      };
      
      const refundResult = await refundsCollection.insertOne(refund);
      
      // Update payment status (placeholder - actual refund processing will be in later parts)
      await paymentsCollection.updateOne(
        { _id: payment._id },
        { $set: { status: 'refunded', updatedAt: new Date() } }
      );
      
      // Update order status
      await orderService.updateOrderStatus(orderId, 'refunded');
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId!,
        actorType: 'user',
        action: 'refund.create',
        objectType: 'refund',
        objectId: refundResult.insertedId.toString(),
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
        data: {
          ...refund,
          _id: refundResult.insertedId.toString(),
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
      
      console.error('Error creating refund:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to create refund',
      });
    }
  }

  /**
   * GET /api/admin/users/:id/sessions
   * List sessions for a user (placeholder)
   */
  static async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      
      // TODO: Implement when sessions collection is ready
      // For now, return placeholder
      res.json({
        ok: true,
        data: [],
        message: 'Session management coming soon',
      });
    } catch (error) {
      console.error('Error getting user sessions:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch sessions',
      });
    }
  }

  /**
   * POST /api/admin/users/:id/revoke-session
   * Revoke a specific session (placeholder)
   */
  static async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const { sessionId } = req.body;
      
      // TODO: Implement when sessions collection is ready
      res.json({
        ok: true,
        message: 'Session revocation coming soon',
      });
    } catch (error) {
      console.error('Error revoking session:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to revoke session',
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


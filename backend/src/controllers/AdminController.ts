/**
 * Admin Controller
 * 
 * Handles admin-only operations: product CRUD, order management, refunds.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { productService } from '../services/ProductService';
import { inventoryService } from '../services/InventoryService';
import { orderService } from '../services/OrderService';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { AuditLog, User } from '../types';
import { parsePagination, getPaginationMeta } from '../helpers/pagination';
import { sanitizePlainText, sanitizeHtmlContent } from '../helpers/sanitize';
import { generateSlug } from '../helpers/validate';
import { Category } from '../controllers/CategoryController';

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  qty: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().max(255).optional(),
});

const updateProductSchema = createProductSchema.partial();

const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(1),
});

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
});

const updateCategorySchema = createCategorySchema.partial();

export class AdminController {
  /**
   * POST /api/admin/products
   * Create a new product
   */
  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const validated = createProductSchema.parse(req.body);
      const files = req.files as Express.Multer.File[] || [];
      
      const product = await productService.createProduct({
        ...validated,
        images: files,
      });
      
      // Set inventory if provided
      if (validated.qty !== undefined && product._id) {
        await inventoryService.setInventory(
          product._id,
          validated.qty,
          validated.lowStockThreshold || 10
        );
      }
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId,
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
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
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
        actorId: req.userId,
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
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
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
        actorId: req.userId,
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
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
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
      // Sanitize user input to prevent XSS
      const sanitizedReason = sanitizePlainText(validated.reason);
      const refund = {
        paymentId: payment._id?.toString(),
        orderId,
        amount: refundAmount,
        initiatedBy: req.userId,
        status: 'requested',
        reason: sanitizedReason,
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
        actorId: req.userId,
        actorType: 'user',
        action: 'refund.create',
        objectType: 'refund',
        objectId: refundResult.insertedId.toString(),
        metadata: {
          orderId,
          amount: refundAmount,
          reason: sanitizedReason,
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
   * GET /api/admin/users
   * List users with pagination and filters
   */
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const pagination = parsePagination(req.query);
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      const query: any = {};
      
      // Search by email
      if (req.query.search) {
        query.email = { $regex: req.query.search, $options: 'i' };
      }
      
      // Filter by role
      if (req.query.role) {
        query.role = req.query.role;
      }
      
      // Filter by status
      if (req.query.status) {
        query.status = req.query.status;
      } else {
        // Default to active users only
        query.status = { $ne: 'deleted' };
      }
      
      const [users, total] = await Promise.all([
        usersCollection
          .find(query)
          .sort({ createdAt: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit)
          .toArray(),
        usersCollection.countDocuments(query),
      ]);
      
      // Remove sensitive data
      const safeUsers = users.map(user => ({
        _id: user._id?.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status || 'active',
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
      
      res.json({
        ok: true,
        items: safeUsers,
        total,
        pages: Math.ceil(total / pagination.limit),
      });
    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch users',
      });
    }
  }

  /**
   * GET /api/admin/users/:id
   * Get user details
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      
      if (!user) {
        res.status(404).json({
          ok: false,
          error: 'User not found',
        });
        return;
      }
      
      // Remove sensitive data
      const safeUser = {
        _id: user._id?.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status || 'active',
        isEmailVerified: user.isEmailVerified,
        emailPreferences: user.emailPreferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      
      res.json({
        ok: true,
        data: safeUser,
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch user',
      });
    }
  }

  /**
   * PUT /api/admin/users/:id/block
   * Block/unblock a user
   */
  static async blockUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const userId = req.params.id;
      const { blocked } = req.body;
      
      if (typeof blocked !== 'boolean') {
        res.status(400).json({
          ok: false,
          error: 'blocked field must be a boolean',
        });
        return;
      }
      
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        res.status(404).json({
          ok: false,
          error: 'User not found',
        });
        return;
      }
      
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            status: blocked ? 'suspended' : 'active',
            updatedAt: new Date(),
          },
        }
      );
      
      // If blocking, revoke all sessions
      if (blocked) {
        const sessionsCollection = db.collection('sessions');
        await sessionsCollection.deleteMany({ userId });
      }
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: blocked ? 'user.block' : 'user.unblock',
        objectType: 'user',
        objectId: userId,
        metadata: { email: user.email, blocked },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        message: blocked ? 'User blocked successfully' : 'User unblocked successfully',
      });
    } catch (error) {
      console.error('Error blocking user:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update user status',
      });
    }
  }

  /**
   * POST /api/admin/users/:id/reset-password
   * Reset user password (admin action)
   */
  static async resetUserPassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const userId = req.params.id;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({
          ok: false,
          error: 'Password must be at least 8 characters',
        });
        return;
      }
      
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        res.status(404).json({
          ok: false,
          error: 'User not found',
        });
        return;
      }
      
      // Hash new password
      const hashedPassword = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
      
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
          // Clear any existing reset tokens
          $unset: {
            resetPasswordToken: '',
            resetPasswordExpires: '',
          },
        }
      );
      
      // Revoke all sessions to force re-login
      const sessionsCollection = db.collection('sessions');
      await sessionsCollection.deleteMany({ userId });
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'user.password.reset',
        objectType: 'user',
        objectId: userId,
        metadata: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        message: 'Password reset successfully. User must log in again.',
      });
    } catch (error) {
      console.error('Error resetting user password:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to reset password',
      });
    }
  }

  /**
   * PUT /api/admin/users/:id/roles
   * Edit user roles
   */
  static async editUserRoles(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const userId = req.params.id;
      const { roles } = req.body;
      
      if (!Array.isArray(roles)) {
        res.status(400).json({
          ok: false,
          error: 'roles must be an array',
        });
        return;
      }
      
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      const userRolesCollection = db.collection('user_roles');
      
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        res.status(404).json({
          ok: false,
          error: 'User not found',
        });
        return;
      }
      
      // Remove existing role assignments
      await userRolesCollection.deleteMany({ userId });
      
      // Add new role assignments
      if (roles.length > 0) {
        const roleAssignments = roles.map((roleId: string) => ({
          userId,
          roleId: new ObjectId(roleId),
          assignedBy: req.userId,
          assignedAt: new Date(),
        }));
        await userRolesCollection.insertMany(roleAssignments);
      }
      
      // Update user's primary role (use first role or null)
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            role: roles.length > 0 ? roles[0] : undefined,
            updatedAt: new Date(),
          },
        }
      );
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'user.roles.update',
        objectType: 'user',
        objectId: userId,
        metadata: { email: user.email, roles },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        message: 'User roles updated successfully',
      });
    } catch (error) {
      console.error('Error updating user roles:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update user roles',
      });
    }
  }

  /**
   * GET /api/admin/users/:id/sessions
   * List sessions for a user
   */
  static async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const db = mongo.getDb();
      const sessionsCollection = db.collection('sessions');
      
      const sessions = await sessionsCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
      
      // Format sessions for response
      const formattedSessions = sessions.map(session => ({
        _id: session._id?.toString(),
        deviceId: session.deviceId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      }));
      
      res.json({
        ok: true,
        data: formattedSessions,
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
   * Revoke a specific session
   */
  static async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const userId = req.params.id;
      const { sessionId } = req.body;
      
      if (!sessionId) {
        res.status(400).json({
          ok: false,
          error: 'sessionId is required',
        });
        return;
      }
      
      const db = mongo.getDb();
      const sessionsCollection = db.collection('sessions');
      
      const result = await sessionsCollection.deleteOne({
        _id: new ObjectId(sessionId),
        userId, // Ensure session belongs to the user
      });
      
      if (result.deletedCount === 0) {
        res.status(404).json({
          ok: false,
          error: 'Session not found',
        });
        return;
      }
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'user.session.revoke',
        objectType: 'session',
        objectId: sessionId,
        metadata: { userId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        message: 'Session revoked successfully',
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
   * POST /api/admin/categories
   * Create a new category
   */
  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const validated = createCategorySchema.parse(req.body);
      const db = mongo.getDb();
      const categoriesCollection = db.collection<Category>('categories');
      
      // Generate slug
      const slug = generateSlug(validated.name);
      
      // Check if slug already exists
      const existing = await categoriesCollection.findOne({ slug });
      if (existing) {
        res.status(400).json({
          ok: false,
          error: 'Category with this name already exists',
        });
        return;
      }
      
      // Sanitize inputs
      const category: Category = {
        name: sanitizePlainText(validated.name),
        slug,
        description: validated.description ? sanitizeHtmlContent(validated.description) : undefined,
        parentId: validated.parentId || undefined,
        sortOrder: validated.sortOrder || 0,
        createdAt: new Date(),
      };
      
      const result = await categoriesCollection.insertOne(category);
      category._id = result.insertedId.toString();
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'category.create',
        objectType: 'category',
        objectId: category._id,
        metadata: { name: category.name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(201).json({
        ok: true,
        data: category,
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
      
      console.error('Error creating category:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to create category',
      });
    }
  }

  /**
   * PUT /api/admin/categories/:id
   * Update a category
   */
  static async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const categoryId = req.params.id;
      const validated = updateCategorySchema.parse(req.body);
      const db = mongo.getDb();
      const categoriesCollection = db.collection<Category>('categories');
      
      const categoryObjId = new ObjectId(categoryId);
      const existing = await categoriesCollection.findOne({ _id: categoryObjId });
      
      if (!existing) {
        res.status(404).json({
          ok: false,
          error: 'Category not found',
        });
        return;
      }
      
      const update: Partial<Category> = {};
      
      if (validated.name !== undefined) {
        update.name = sanitizePlainText(validated.name);
        update.slug = generateSlug(validated.name);
        
        // Check if new slug conflicts with another category
        const slugConflict = await categoriesCollection.findOne({
          slug: update.slug,
          _id: { $ne: categoryObjId },
        });
        if (slugConflict) {
          res.status(400).json({
            ok: false,
            error: 'Category with this name already exists',
          });
          return;
        }
      }
      
      if (validated.description !== undefined) {
        update.description = validated.description ? sanitizeHtmlContent(validated.description) : undefined;
      }
      
      if (validated.parentId !== undefined) {
        update.parentId = validated.parentId || undefined;
      }
      
      if (validated.sortOrder !== undefined) {
        update.sortOrder = validated.sortOrder;
      }
      
      await categoriesCollection.updateOne(
        { _id: categoryObjId },
        { $set: update }
      );
      
      const updated = await categoriesCollection.findOne({ _id: categoryObjId });
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'category.update',
        objectType: 'category',
        objectId: categoryId,
        metadata: { name: updated?.name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        data: updated,
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
      
      console.error('Error updating category:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update category',
      });
    }
  }

  /**
   * DELETE /api/admin/categories/:id
   * Delete a category
   */
  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const categoryId = req.params.id;
      const db = mongo.getDb();
      const categoriesCollection = db.collection<Category>('categories');
      const productsCollection = db.collection('products');
      
      const categoryObjId = new ObjectId(categoryId);
      const category = await categoriesCollection.findOne({ _id: categoryObjId });
      
      if (!category) {
        res.status(404).json({
          ok: false,
          error: 'Category not found',
        });
        return;
      }
      
      // Check if category has products
      const productCount = await productsCollection.countDocuments({ categoryId });
      if (productCount > 0) {
        res.status(400).json({
          ok: false,
          error: `Cannot delete category: ${productCount} product(s) are using this category`,
        });
        return;
      }
      
      // Check if category has subcategories
      const subcategoryCount = await categoriesCollection.countDocuments({ parentId: categoryId });
      if (subcategoryCount > 0) {
        res.status(400).json({
          ok: false,
          error: `Cannot delete category: ${subcategoryCount} subcategory(ies) exist`,
        });
        return;
      }
      
      await categoriesCollection.deleteOne({ _id: categoryObjId });
      
      // Log audit event
      await AdminController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'category.delete',
        objectType: 'category',
        objectId: categoryId,
        metadata: { name: category.name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to delete category',
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


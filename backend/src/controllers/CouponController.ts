/**
 * Coupon Controller
 * 
 * Handles coupon operations: validate, apply, admin CRUD.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { couponService } from '../services/CouponService';
import { cartService } from '../services/CartService';

const applyCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
});

const createCouponSchema = z.object({
  code: z.string().min(3).max(20),
  type: z.enum(['flat', 'percentage', 'buy_x_get_y', 'first_order']),
  description: z.string().optional(),
  flatAmount: z.number().positive().optional(),
  percentage: z.number().min(0).max(100).optional(),
  maxDiscount: z.number().positive().optional(),
  buyX: z.number().int().positive().optional(),
  getY: z.number().int().positive().optional(),
  getYProductId: z.string().optional(),
  firstOrderOnly: z.boolean().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  maxUses: z.number().int().positive().optional(),
  maxUsesPerUser: z.number().int().positive().optional(),
  minOrderAmount: z.number().positive().optional(),
  applicableCategories: z.array(z.string()).optional(),
  applicableProducts: z.array(z.string()).optional(),
  excludedProducts: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export class CouponController {
  /**
   * POST /api/coupons/validate
   * Validate and calculate discount for a coupon
   */
  static async validateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const validated = applyCouponSchema.parse(req.body);

      // Get user's cart
      const cart = await cartService.getCart(req.userId, req.sessionId);
      if (!cart || cart.items.length === 0) {
        res.status(400).json({
          ok: false,
          error: 'Cart is empty',
        });
        return;
      }

      // Calculate order amount
      const orderAmount = cart.items.reduce(
        (sum, item) => sum + item.priceAt * item.qty,
        0
      );

      // Build order items for validation
      const orderItems = cart.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        price: item.priceAt,
      }));

      // Validate coupon
      const result = await couponService.validateCoupon(
        validated.code,
        req.userId,
        orderAmount,
        orderItems
      );

      if (!result.valid) {
        res.status(400).json({
          ok: false,
          error: result.error || 'Invalid coupon',
          discount: 0,
        });
        return;
      }

      res.json({
        ok: true,
        data: {
          code: validated.code,
          discount: result.discount,
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

      console.error('Error validating coupon:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to validate coupon',
      });
    }
  }

  /**
   * POST /api/admin/coupons
   * Create a new coupon (admin only)
   */
  static async createCoupon(req: Request, res: Response): Promise<void> {
    try {
      const validated = createCouponSchema.parse(req.body);

      const coupon = await couponService.createCoupon({
        ...validated,
        validFrom: new Date(validated.validFrom),
        validUntil: new Date(validated.validUntil),
        isActive: validated.isActive ?? true,
      });

      res.status(201).json({
        ok: true,
        data: coupon,
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

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          ok: false,
          error: error.message,
        });
        return;
      }

      console.error('Error creating coupon:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to create coupon',
      });
    }
  }

  /**
   * GET /api/admin/coupons
   * List all coupons (admin only)
   */
  static async listCoupons(req: Request, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const coupons = await couponService.listCoupons(activeOnly);

      res.json({
        ok: true,
        data: coupons,
      });
    } catch (error) {
      console.error('Error listing coupons:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to list coupons',
      });
    }
  }

  /**
   * PUT /api/admin/coupons/:id
   * Update coupon (admin only)
   */
  static async updateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = createCouponSchema.partial().parse(req.body);

      // Convert date strings to Date objects if present
      if (updates.validFrom) {
        updates.validFrom = new Date(updates.validFrom as any) as any;
      }
      if (updates.validUntil) {
        updates.validUntil = new Date(updates.validUntil as any) as any;
      }

      const coupon = await couponService.updateCoupon(id, updates as any);

      if (!coupon) {
        res.status(404).json({
          ok: false,
          error: 'Coupon not found',
        });
        return;
      }

      res.json({
        ok: true,
        data: coupon,
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

      console.error('Error updating coupon:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update coupon',
      });
    }
  }

  /**
   * DELETE /api/admin/coupons/:id
   * Delete coupon (admin only)
   */
  static async deleteCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await couponService.deleteCoupon(id);

      res.json({
        ok: true,
        message: 'Coupon deleted',
      });
    } catch (error) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to delete coupon',
      });
    }
  }
}


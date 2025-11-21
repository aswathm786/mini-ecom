/**
 * Coupon Service
 * 
 * Manages discount coupons with multiple types:
 * - Flat discount (fixed amount)
 * - Percentage discount
 * - Buy X Get Y
 * - First order discount
 */

import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';
import { platformSettingsService } from './PlatformSettingsService';

export type CouponType = 'flat' | 'percentage' | 'buy_x_get_y' | 'first_order';

export interface Coupon {
  _id?: string;
  code: string;
  type: CouponType;
  description?: string;
  
  // Flat discount
  flatAmount?: number;
  
  // Percentage discount
  percentage?: number;
  maxDiscount?: number; // Maximum discount cap for percentage
  
  // Buy X Get Y
  buyX?: number;
  getY?: number;
  getYProductId?: string; // Specific product for BxGy
  
  // First order only
  firstOrderOnly?: boolean;
  
  // Validity
  validFrom: Date;
  validUntil: Date;
  
  // Usage limits
  maxUses?: number; // Total uses allowed
  maxUsesPerUser?: number; // Per user limit
  minOrderAmount?: number; // Minimum order value
  
  // Applicability
  applicableCategories?: string[];
  applicableProducts?: string[];
  excludedProducts?: string[];
  
  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponUsage {
  _id?: string;
  couponId: string;
  couponCode: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  usedAt: Date;
}

interface CouponValidationResult {
  valid: boolean;
  discount: number;
  error?: string;
}

class CouponService {
  /**
   * Create a new coupon
   */
  async createCoupon(coupon: Omit<Coupon, '_id' | 'createdAt' | 'updatedAt'>): Promise<Coupon> {
    const db = mongo.getDb();
    const couponsCollection = db.collection<Coupon>('coupons');

    // Check if code already exists
    const existing = await couponsCollection.findOne({ code: coupon.code.toUpperCase() });
    if (existing) {
      throw new Error('Coupon code already exists');
    }

    const newCoupon: Coupon = {
      ...coupon,
      code: coupon.code.toUpperCase(),
      isActive: coupon.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await couponsCollection.insertOne(newCoupon);
    newCoupon._id = result.insertedId.toString();

    return newCoupon;
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string): Promise<Coupon | null> {
    const db = mongo.getDb();
    const couponsCollection = db.collection<Coupon>('coupons');

    const coupon = await couponsCollection.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    return coupon;
  }

  /**
   * Validate and calculate discount for a coupon
   */
  async validateCoupon(
    code: string,
    userId: string | undefined,
    orderAmount: number,
    orderItems: Array<{ productId: string; qty: number; price: number }>
  ): Promise<CouponValidationResult> {
    const settings = await platformSettingsService.getSettings();
    if (!settings.features.coupons.enabled) {
      return {
        valid: false,
        discount: 0,
        error: 'Coupons are currently disabled',
      };
    }

    const coupon = await this.getCouponByCode(code);
    
    if (!coupon) {
      return {
        valid: false,
        discount: 0,
        error: 'Invalid coupon code',
      };
    }

    // Check validity dates
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return {
        valid: false,
        discount: 0,
        error: 'Coupon has expired or is not yet valid',
      };
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return {
        valid: false,
        discount: 0,
        error: `Minimum order amount of ${coupon.minOrderAmount} required`,
      };
    }

    // Check first order only
    if (coupon.firstOrderOnly && userId) {
      const db = mongo.getDb();
      const ordersCollection = db.collection('orders');
      const orderCount = await ordersCollection.countDocuments({ userId });
      
      if (orderCount > 0) {
        return {
          valid: false,
          discount: 0,
          error: 'This coupon is only valid for first order',
        };
      }
    }

    // Check usage limits
    if (coupon.maxUses) {
      const usageCount = await this.getUsageCount(coupon._id!);
      if (usageCount >= coupon.maxUses) {
        return {
          valid: false,
          discount: 0,
          error: 'Coupon usage limit reached',
        };
      }
    }

    // Check per-user limit
    if (coupon.maxUsesPerUser && userId) {
      const userUsageCount = await this.getUserUsageCount(coupon._id!, userId);
      if (userUsageCount >= coupon.maxUsesPerUser) {
        return {
          valid: false,
          discount: 0,
          error: 'You have already used this coupon',
        };
      }
    }

    // Check product/category applicability
    if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
      const hasApplicableProduct = orderItems.some((item) =>
        coupon.applicableProducts!.includes(item.productId)
      );
      if (!hasApplicableProduct) {
        return {
          valid: false,
          discount: 0,
          error: 'Coupon not applicable to items in cart',
        };
      }
    }

    if (coupon.excludedProducts && coupon.excludedProducts.length > 0) {
      const hasExcludedProduct = orderItems.some((item) =>
        coupon.excludedProducts!.includes(item.productId)
      );
      if (hasExcludedProduct) {
        return {
          valid: false,
          discount: 0,
          error: 'Coupon cannot be used with items in cart',
        };
      }
    }

    // Calculate discount
    let discount = 0;

    switch (coupon.type) {
      case 'flat':
        if (!settings.features.coupons.types.flat) {
          return { valid: false, discount: 0, error: 'Flat coupons are disabled' };
        }
        discount = coupon.flatAmount || 0;
        break;

      case 'percentage':
        if (!settings.features.coupons.types.percent) {
          return { valid: false, discount: 0, error: 'Percentage coupons are disabled' };
        }
        discount = (orderAmount * (coupon.percentage || 0)) / 100;
        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount);
        }
        break;

      case 'buy_x_get_y':
        if (!settings.features.coupons.types.bxgy) {
          return { valid: false, discount: 0, error: 'Buy X Get Y coupons are disabled' };
        }
        // For BxGy, discount is calculated based on the cheapest item in the set
        // This is a simplified implementation
        if (coupon.buyX && coupon.getY) {
          // Calculate discount for the free items
          const sortedItems = [...orderItems].sort((a, b) => a.price - b.price);
          const freeItemsCount = Math.floor(
            orderItems.reduce((sum, item) => sum + item.qty, 0) / coupon.buyX
          ) * coupon.getY;
          discount = sortedItems
            .slice(0, freeItemsCount)
            .reduce((sum, item) => sum + item.price * Math.min(item.qty, freeItemsCount), 0);
        }
        break;

      default:
        return {
          valid: false,
          discount: 0,
          error: 'Invalid coupon type',
        };
    }

    // Ensure discount doesn't exceed order amount
    discount = Math.min(discount, orderAmount);

    return {
      valid: true,
      discount: Math.round(discount * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Record coupon usage
   */
  async recordUsage(
    couponId: string,
    couponCode: string,
    userId: string,
    orderId: string,
    discountAmount: number
  ): Promise<void> {
    const db = mongo.getDb();
    const usageCollection = db.collection<CouponUsage>('coupon_usage');

    await usageCollection.insertOne({
      couponId,
      couponCode,
      userId,
      orderId,
      discountAmount,
      usedAt: new Date(),
    });
  }

  /**
   * Get usage count for a coupon
   */
  private async getUsageCount(couponId: string): Promise<number> {
    const db = mongo.getDb();
    const usageCollection = db.collection<CouponUsage>('coupon_usage');

    return await usageCollection.countDocuments({ couponId });
  }

  /**
   * Get user usage count for a coupon
   */
  private async getUserUsageCount(couponId: string, userId: string): Promise<number> {
    const db = mongo.getDb();
    const usageCollection = db.collection<CouponUsage>('coupon_usage');

    return await usageCollection.countDocuments({ couponId, userId });
  }

  /**
   * List all coupons (admin)
   */
  async listCoupons(activeOnly = false): Promise<Coupon[]> {
    const db = mongo.getDb();
    const couponsCollection = db.collection<Coupon>('coupons');

    const query: any = {};
    if (activeOnly) {
      query.isActive = true;
      query.validFrom = { $lte: new Date() };
      query.validUntil = { $gte: new Date() };
    }

    return await couponsCollection.find(query).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Update coupon
   */
  async updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    const db = mongo.getDb();
    const couponsCollection = db.collection<Coupon>('coupons');

    await couponsCollection.updateOne(
      { _id: new ObjectId(couponId) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );

    return await couponsCollection.findOne({ _id: new ObjectId(couponId) });
  }

  /**
   * Delete coupon
   */
  async deleteCoupon(couponId: string): Promise<void> {
    const db = mongo.getDb();
    const couponsCollection = db.collection<Coupon>('coupons');

    await couponsCollection.deleteOne({ _id: new ObjectId(couponId) });
  }
}

export const couponService = new CouponService();


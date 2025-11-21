/**
 * useCoupons Hook
 * 
 * Manages coupon CRUD operations for admin.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAdminApi } from './useAdminApi';

export type CouponType = 'flat' | 'percentage' | 'buy_x_get_y' | 'first_order';

export interface Coupon {
  _id?: string;
  code: string;
  type: CouponType;
  description?: string;
  flatAmount?: number;
  percentage?: number;
  maxDiscount?: number;
  buyX?: number;
  getY?: number;
  getYProductId?: string;
  firstOrderOnly?: boolean;
  validFrom: string | Date;
  validUntil: string | Date;
  maxUses?: number;
  maxUsesPerUser?: number;
  minOrderAmount?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  excludedProducts?: string[];
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface UseCouponsResult {
  coupons: Coupon[];
  loading: boolean;
  error: string | null;
  createCoupon: (coupon: Omit<Coupon, '_id' | 'createdAt' | 'updatedAt'>) => Promise<Coupon | null>;
  updateCoupon: (id: string, updates: Partial<Coupon>) => Promise<Coupon | null>;
  deleteCoupon: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useCoupons(activeOnly: boolean = false): UseCouponsResult {
  const api = useAdminApi();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // useAdminApi returns the data directly (response.data), not the full response
      const coupons = await api.get<Coupon[]>(
        `/coupons${activeOnly ? '?activeOnly=true' : ''}`
      );
      
      setCoupons(coupons || []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  }, [api, activeOnly]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const createCoupon = useCallback(async (coupon: Omit<Coupon, '_id' | 'createdAt' | 'updatedAt'>): Promise<Coupon | null> => {
    try {
      // Convert dates to ISO strings
      const couponData = {
        ...coupon,
        validFrom: coupon.validFrom instanceof Date ? coupon.validFrom.toISOString() : coupon.validFrom,
        validUntil: coupon.validUntil instanceof Date ? coupon.validUntil.toISOString() : coupon.validUntil,
      };

      // useAdminApi returns the data directly (response.data), not the full response
      const newCoupon = await api.post<Coupon>('/coupons', couponData);
      
      await fetchCoupons();
      return newCoupon;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create coupon');
      return null;
    }
  }, [api, fetchCoupons]);

  const updateCoupon = useCallback(async (id: string, updates: Partial<Coupon>): Promise<Coupon | null> => {
    try {
      // Convert dates to ISO strings if present
      const updateData: any = { ...updates };
      if (updates.validFrom) {
        updateData.validFrom = updates.validFrom instanceof Date 
          ? updates.validFrom.toISOString() 
          : updates.validFrom;
      }
      if (updates.validUntil) {
        updateData.validUntil = updates.validUntil instanceof Date 
          ? updates.validUntil.toISOString() 
          : updates.validUntil;
      }

      // useAdminApi returns the data directly (response.data), not the full response
      const updatedCoupon = await api.put<Coupon>(`/coupons/${id}`, updateData);
      
      await fetchCoupons();
      return updatedCoupon;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update coupon');
      return null;
    }
  }, [api, fetchCoupons]);

  const deleteCoupon = useCallback(async (id: string): Promise<boolean> => {
    try {
      // useAdminApi returns the data directly, which could be anything
      // For delete operations, we just check if it completes without throwing
      await api.delete(`/coupons/${id}`);
      
      await fetchCoupons();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete coupon');
      return false;
    }
  }, [api, fetchCoupons]);

  return {
    coupons,
    loading,
    error,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    refetch: fetchCoupons,
  };
}


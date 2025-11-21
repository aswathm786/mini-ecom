/**
 * useCheckout Hook
 * 
 * Manages checkout flow: order creation, Razorpay integration, payment confirmation.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { csrfFetch } from '../lib/csrfFetch';
import { openRazorpayCheckout, RazorpayPaymentResponse } from '../lib/razorpayLoader';
import { bootstrapCsrf } from '../lib/csrf';

export interface Address {
  _id?: string;
  name: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export interface ShippingOption {
  service: string;
  name: string;
  charge: number;
  estimatedDays: number;
}

export interface CheckoutOrder {
  orderId: string;
  amount: number;
  currency: string;
  payment_method: 'razorpay' | 'cod';
  razorpay_order_id?: string;
  key_id?: string;
}

interface UseCheckoutResult {
  isProcessing: boolean;
  error: string | null;
  createOrder: (data: CreateOrderData) => Promise<CheckoutOrder | null>;
  createRazorpayOrder: (orderId: string) => Promise<{ razorpay_order_id: string; key_id: string } | null>;
  confirmRazorpayPayment: (data: ConfirmRazorpayData) => Promise<boolean>;
  initiateRazorpayCheckout: (order: CheckoutOrder, userInfo: UserInfo) => Promise<void>;
}

interface CreateOrderData {
  shipping_address: Address;
  billing_address?: Address;
  shipping_method?: string;
  shipping_cost?: number;
  payment_method: 'razorpay' | 'cod';
  coupon_code?: string;
}

interface ConfirmRazorpayData {
  orderId: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface UserInfo {
  name: string;
  email: string;
  contact?: string;
}

export function useCheckout(): UseCheckoutResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * Create order (for COD or before Razorpay)
   */
  const createOrder = useCallback(async (data: CreateOrderData): Promise<CheckoutOrder | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      let response = await csrfFetch('/api/checkout/create-order', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      // Handle CSRF error with retry
      if (!response.ok && (response.code === 'CSRF_ERROR' || response.error?.includes('CSRF'))) {
        await bootstrapCsrf();
        // Retry the request with fresh CSRF token
        response = await csrfFetch('/api/checkout/create-order', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create order');
      }

      if (!response.data) {
        throw new Error('Invalid response from server');
      }

      return response.data as CheckoutOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Create Razorpay order
   */
  const createRazorpayOrder = useCallback(
    async (orderId: string): Promise<{ razorpay_order_id: string; key_id: string } | null> => {
      setIsProcessing(true);
      setError(null);

      try {
        const response = await csrfFetch('/api/checkout/create-razorpay-order', {
          method: 'POST',
          body: JSON.stringify({ orderId }),
        });

        if (!response.ok) {
          if (response.code === 'CSRF_ERROR' || response.error?.includes('CSRF')) {
            await bootstrapCsrf();
            throw new Error('CSRF token expired. Please try again.');
          }
          throw new Error(response.error || 'Failed to create Razorpay order');
        }

        if (!response.data) {
          throw new Error('Invalid response from server');
        }

        return response.data as { razorpay_order_id: string; key_id: string };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create Razorpay order';
        setError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  /**
   * Confirm Razorpay payment on server
   */
  const confirmRazorpayPayment = useCallback(
    async (data: ConfirmRazorpayData): Promise<boolean> => {
      setIsProcessing(true);
      setError(null);

      try {
        const response = await csrfFetch('/api/checkout/confirm-razorpay', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          if (response.code === 'CSRF_ERROR' || response.error?.includes('CSRF')) {
            await bootstrapCsrf();
            throw new Error('CSRF token expired. Please try again.');
          }
          throw new Error(response.error || 'Payment verification failed');
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Payment verification failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  /**
   * Initiate Razorpay checkout flow
   */
  const initiateRazorpayCheckout = useCallback(
    async (order: CheckoutOrder, userInfo: UserInfo): Promise<void> => {
      if (!order.razorpay_order_id || !order.key_id) {
        throw new Error('Razorpay order not created');
      }

      try {
        await openRazorpayCheckout({
          key: order.key_id,
          amount: order.amount * 100, // Convert to paise
          order_id: order.razorpay_order_id,
          name: 'Handmade Harmony',
          description: `Order #${order.orderId}`,
          prefill: {
            name: userInfo.name,
            email: userInfo.email,
            contact: userInfo.contact,
          },
          theme: {
            color: '#DC2626', // primary-600
          },
          handler: async (response: RazorpayPaymentResponse) => {
            // Verify payment on server
            const verified = await confirmRazorpayPayment({
              orderId: order.orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verified) {
              // Navigate to confirmation page
              navigate(`/order/${order.orderId}/confirmation`);
            } else {
              throw new Error('Payment verification failed');
            }
          },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to open payment gateway';
        setError(errorMessage);
        throw err;
      }
    },
    [confirmRazorpayPayment, navigate]
  );

  return {
    isProcessing,
    error,
    createOrder,
    createRazorpayOrder,
    confirmRazorpayPayment,
    initiateRazorpayCheckout,
  };
}


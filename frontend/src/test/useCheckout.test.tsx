/**
 * useCheckout Hook Test
 * 
 * Tests checkout hook behavior including Razorpay order creation and confirmation.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useCheckout } from '../hooks/useCheckout';
import { csrfFetch } from '../lib/csrfFetch';
import { openRazorpayCheckout } from '../lib/razorpayLoader';

jest.mock('../lib/csrfFetch');
jest.mock('../lib/razorpayLoader');
jest.mock('../lib/csrf', () => ({
  bootstrapCsrf: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

const mockCsrfFetch = csrfFetch as jest.MockedFunction<typeof csrfFetch>;
const mockOpenRazorpayCheckout = openRazorpayCheckout as jest.MockedFunction<typeof openRazorpayCheckout>;

describe('useCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create order successfully', async () => {
    mockCsrfFetch.mockResolvedValueOnce({
      ok: true,
      data: {
        orderId: 'order_123',
        amount: 1000,
        currency: 'INR',
        payment_method: 'cod',
      },
    });

    const { result } = renderHook(() => useCheckout());

    const order = await result.current.createOrder({
      shipping_address: {
        name: 'Test User',
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        country: 'India',
      },
      payment_method: 'cod',
    });

    expect(order).toBeDefined();
    expect(order?.orderId).toBe('order_123');
    expect(mockCsrfFetch).toHaveBeenCalledWith('/api/checkout/create-order', expect.any(Object));
  });

  it('should create Razorpay order', async () => {
    mockCsrfFetch
      .mockResolvedValueOnce({
        ok: true,
        data: {
          orderId: 'order_123',
          amount: 1000,
          currency: 'INR',
          payment_method: 'razorpay',
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          razorpay_order_id: 'order_razorpay_123',
          key_id: 'rzp_test_123',
        },
      });

    const { result } = renderHook(() => useCheckout());

    const razorpayOrder = await result.current.createRazorpayOrder('order_123');

    expect(razorpayOrder).toBeDefined();
    expect(razorpayOrder?.razorpay_order_id).toBe('order_razorpay_123');
    expect(razorpayOrder?.key_id).toBe('rzp_test_123');
  });

  it('should confirm Razorpay payment', async () => {
    mockCsrfFetch.mockResolvedValueOnce({
      ok: true,
      data: {
        orderId: 'order_123',
        paymentStatus: 'completed',
      },
    });

    const { result } = renderHook(() => useCheckout());

    const confirmed = await result.current.confirmRazorpayPayment({
      orderId: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_order_id: 'order_razorpay_123',
      razorpay_signature: 'signature_123',
    });

    expect(confirmed).toBe(true);
    expect(mockCsrfFetch).toHaveBeenCalledWith(
      '/api/checkout/confirm-razorpay',
      expect.objectContaining({
        body: expect.stringContaining('razorpay_payment_id'),
      })
    );
  });

  it('should handle payment confirmation failure', async () => {
    mockCsrfFetch.mockResolvedValueOnce({
      ok: false,
      error: 'Invalid signature',
    });

    const { result } = renderHook(() => useCheckout());

    await expect(
      result.current.confirmRazorpayPayment({
        orderId: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_order_id: 'order_razorpay_123',
        razorpay_signature: 'invalid_signature',
      })
    ).rejects.toThrow();
  });
});


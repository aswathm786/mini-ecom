/**
 * Order Summary Component
 * 
 * Displays order items, totals, and coupon code input.
 */

import { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { formatCurrency } from '../../lib/format';
import { Link } from 'react-router-dom';
import { csrfFetch } from '../../lib/csrfFetch';

interface OrderSummaryProps {
  shippingCharge?: number;
  couponCode?: string;
  onCouponApplied?: (code: string, discount: number) => void;
}

export function OrderSummary({ shippingCharge = 0, couponCode, onCouponApplied }: OrderSummaryProps) {
  const { items, subtotal } = useCart();
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    couponCode ? { code: couponCode, discount: 0 } : null
  );

  const tax = subtotal * 0.18; // TODO: Get tax rate from config
  const discount = appliedCoupon?.discount || 0;
  const total = subtotal + shippingCharge + tax - discount;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      return;
    }

    setApplyingCoupon(true);
    setCouponError(null);

    try {
      const response = await csrfFetch('/api/cart/apply-coupon', {
        method: 'POST',
        body: JSON.stringify({ code: couponInput.trim() }),
      });

      if (response.ok && response.data) {
        const discount = response.data.discount || 0;
        setAppliedCoupon({ code: couponInput.trim(), discount });
        onCouponApplied?.(couponInput.trim(), discount);
      } else {
        setCouponError(response.error || 'Invalid coupon code');
      }
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : 'Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

      {/* Items */}
      <div className="space-y-3 mb-4">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center justify-between text-sm">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{item.name || 'Product'}</div>
              <div className="text-gray-600">Qty: {item.qty}</div>
            </div>
            <div className="font-medium text-gray-900">
              {formatCurrency(item.priceAt * item.qty)}
            </div>
          </div>
        ))}
      </div>

      {/* Coupon Code */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <label htmlFor="coupon" className="block text-sm font-medium text-gray-700 mb-2">
          Coupon Code
        </label>
        <div className="flex gap-2">
          <input
            id="coupon"
            type="text"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            placeholder="Enter coupon code"
            disabled={!!appliedCoupon}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
          />
          {appliedCoupon ? (
            <button
              type="button"
              onClick={() => {
                setAppliedCoupon(null);
                setCouponInput('');
                onCouponApplied?.('', 0);
              }}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={applyingCoupon || !couponInput.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Apply
            </button>
          )}
        </div>
        {couponError && (
          <p className="mt-1 text-sm text-red-600">{couponError}</p>
        )}
        {appliedCoupon && (
          <p className="mt-1 text-sm text-green-600">
            Coupon "{appliedCoupon.code}" applied - {formatCurrency(appliedCoupon.discount)} off
          </p>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900 font-medium">{formatCurrency(subtotal)}</span>
        </div>
        {appliedCoupon && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Discount</span>
            <span className="text-green-600 font-medium">-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="text-gray-900 font-medium">
            {shippingCharge === 0 ? 'Free' : formatCurrency(shippingCharge)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax</span>
          <span className="text-gray-900 font-medium">{formatCurrency(tax)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2">
          <div className="flex justify-between">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-base font-semibold text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <Link to="/cart" className="text-sm text-primary-600 hover:text-primary-700">
        ← Back to Cart
      </Link>
    </div>
  );
}


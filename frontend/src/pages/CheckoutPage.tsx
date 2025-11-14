/**
 * Checkout Page
 * 
 * Complete checkout flow with address, shipping, payment selection, and order creation.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { useCheckout, Address } from '../hooks/useCheckout';
import { AddressSelector } from '../components/Checkout/AddressSelector';
import { ShippingOptions } from '../components/Checkout/ShippingOptions';
import { PaymentMethods } from '../components/Checkout/PaymentMethods';
import { OrderSummary } from '../components/Checkout/OrderSummary';
import { Button } from '../components/Button';
import { ToastContainer } from '../components/Toast';
import '../styles/checkout.css';

export function CheckoutPage() {
  const { isAuthenticated, user } = useAuth();
  const { items, itemCount } = useCart();
  const navigate = useNavigate();
  const {
    isProcessing,
    error: checkoutError,
    createOrder,
    createRazorpayOrder,
    initiateRazorpayCheckout,
  } = useCheckout();

  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [billingAddress, setBillingAddress] = useState<Address | null>(null);
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [shippingMethod, setShippingMethod] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    }
  }, [isAuthenticated, navigate]);

  // Redirect if cart is empty
  useEffect(() => {
    if (itemCount === 0) {
      navigate('/cart');
    }
  }, [itemCount, navigate]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!shippingAddress) {
      errors.shippingAddress = 'Please select or enter a shipping address';
    }

    if (!useSameAddress && !billingAddress) {
      errors.billingAddress = 'Please select or enter a billing address';
    }

    if (!shippingMethod) {
      errors.shippingMethod = 'Please select a shipping method';
    }

    if (!termsAccepted) {
      errors.terms = 'You must accept the terms and conditions';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    if (!shippingAddress) {
      return;
    }

    try {
      // Create order
      const order = await createOrder({
        shipping_address: shippingAddress,
        billing_address: useSameAddress ? shippingAddress : billingAddress || shippingAddress,
        shipping_method: shippingMethod,
        payment_method: paymentMethod,
        coupon_code: couponCode || undefined,
      });

      if (!order) {
        throw new Error('Failed to create order');
      }

      if (paymentMethod === 'cod') {
        // COD - redirect to confirmation immediately
        navigate(`/order/${order.orderId}/confirmation`);
      } else {
        // Razorpay - create Razorpay order and open checkout
        try {
          const razorpayOrder = await createRazorpayOrder(order.orderId);
          if (!razorpayOrder) {
            throw new Error('Failed to create Razorpay order');
          }

          // Update order with Razorpay details
          const updatedOrder = {
            ...order,
            razorpay_order_id: razorpayOrder.razorpay_order_id,
            key_id: razorpayOrder.key_id,
          };

          // Open Razorpay checkout
          await initiateRazorpayCheckout(updatedOrder, {
            name: user?.firstName && user?.lastName
              ? `${user.firstName} ${user.lastName}`
              : user?.email || 'Customer',
            email: user?.email || '',
          });
        } catch (razorpayError) {
          // If Razorpay fails, show error but order is already created
          addToast(
            razorpayError instanceof Error
              ? razorpayError.message
              : 'Failed to open payment gateway. Order created but payment pending.',
            'error'
          );
          // Still redirect to confirmation
          navigate(`/order/${order.orderId}/confirmation`);
        }
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to place order', 'error');
    }
  };

  if (!isAuthenticated || itemCount === 0) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipping Address */}
          <section>
            <AddressSelector
              selectedAddress={shippingAddress || undefined}
              onSelect={setShippingAddress}
              onNewAddress={setShippingAddress}
            />
            {validationErrors.shippingAddress && (
              <p className="mt-2 text-sm text-red-600">{validationErrors.shippingAddress}</p>
            )}
          </section>

          {/* Billing Address */}
          <section>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useSameAddress}
                  onChange={(e) => setUseSameAddress(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Billing address same as shipping</span>
              </label>
            </div>
            {!useSameAddress && (
              <AddressSelector
                selectedAddress={billingAddress || undefined}
                onSelect={setBillingAddress}
                onNewAddress={setBillingAddress}
              />
            )}
            {validationErrors.billingAddress && (
              <p className="mt-2 text-sm text-red-600">{validationErrors.billingAddress}</p>
            )}
          </section>

          {/* Shipping Options */}
          {shippingAddress?.pincode && (
            <section>
              <ShippingOptions
                pincode={shippingAddress.pincode}
                selected={shippingMethod}
                onSelect={setShippingMethod}
              />
              {validationErrors.shippingMethod && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.shippingMethod}</p>
              )}
            </section>
          )}

          {/* Payment Methods */}
          <section>
            <PaymentMethods selected={paymentMethod} onSelect={setPaymentMethod} />
          </section>

          {/* Terms and Conditions */}
          <section>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 mr-2"
                required
              />
              <span className="text-sm text-gray-700">
                I agree to the{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700">
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-600 hover:text-primary-700">
                  Privacy Policy
                </a>
              </span>
            </label>
            {validationErrors.terms && (
              <p className="mt-2 text-sm text-red-600">{validationErrors.terms}</p>
            )}
          </section>

          {/* Error Display */}
          {checkoutError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-700">{checkoutError}</p>
            </div>
          )}

          {/* Place Order Button */}
          <div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handlePlaceOrder}
              disabled={isProcessing || !termsAccepted}
              isLoading={isProcessing}
              aria-busy={isProcessing}
            >
              {paymentMethod === 'cod' ? 'Place Order' : 'Pay with Razorpay'}
            </Button>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <OrderSummary
              couponCode={couponCode}
              onCouponApplied={(code, discount) => {
                setCouponCode(code);
                setCouponDiscount(discount);
              }}
            />
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


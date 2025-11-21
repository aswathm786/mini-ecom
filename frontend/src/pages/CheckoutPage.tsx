/**
 * Checkout Page
 * 
 * Complete checkout flow with address, shipping, payment selection, and order creation.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useCheckout, Address, ShippingOption } from '../hooks/useCheckout';
import { AddressSelector } from '../components/Checkout/AddressSelector';
import { ShippingOptions } from '../components/Checkout/ShippingOptions';
import { PaymentMethods } from '../components/Checkout/PaymentMethods';
import { OrderSummary } from '../components/Checkout/OrderSummary';
import { Button } from '../components/Button';
import { ToastContainer } from '../components/Toast';
import '../styles/checkout.css';

export function CheckoutPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { items, itemCount, isLoading: cartLoading } = useCart();
  const { methods: paymentMethods, loading: paymentMethodsLoading } = usePaymentMethods();
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
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const enabledPaymentMethods = paymentMethods.filter(m => m.enabled);
  const hasPaymentMethods = enabledPaymentMethods.length > 0;

  // Wait for auth and cart to load before checking
  useEffect(() => {
    if (authLoading || cartLoading) {
      return; // Wait for loading to complete
    }

    // Redirect if not authenticated
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }

    // Redirect if cart is empty
    if (itemCount === 0) {
      navigate('/cart');
    }
  }, [isAuthenticated, itemCount, navigate, authLoading, cartLoading]);

  // Reset shipping when address changes
  useEffect(() => {
    if (shippingAddress?.pincode) {
      setShippingMethod('');
      setShippingCharge(0);
      setShippingOptions([]);
    }
  }, [shippingAddress?.pincode]);

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
        shipping_cost: shippingCharge,
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

  // Show loading state while checking auth and cart
  if (authLoading || cartLoading || paymentMethodsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if redirecting
  if (!isAuthenticated || itemCount === 0) {
    return null; // Will redirect
  }

  // Block checkout if no payment methods are enabled
  if (!hasPaymentMethods) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Checkout Unavailable</h2>
          <p className="text-gray-700 mb-6">
            We're sorry, but checkout is currently unavailable. No payment methods are enabled at this time.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Please contact our support team or try again later.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/cart">
              <Button variant="outline">Back to Cart</Button>
            </Link>
            <Link to="/products">
              <Button variant="primary">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    );
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
                onSelect={(service, charge) => {
                  setShippingMethod(service);
                  if (charge !== undefined) {
                    setShippingCharge(charge);
                  } else {
                    // Fallback: find from options if charge not provided
                    const selectedOption = shippingOptions.find(opt => opt.service === service);
                    if (selectedOption) {
                      setShippingCharge(selectedOption.charge);
                    }
                  }
                }}
                onOptionsLoaded={(options) => {
                  setShippingOptions(options);
                  // If a shipping method is already selected, update the charge
                  if (shippingMethod) {
                    const selectedOption = options.find(opt => opt.service === shippingMethod);
                    if (selectedOption) {
                      setShippingCharge(selectedOption.charge);
                    }
                  }
                }}
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
              shippingCharge={shippingCharge}
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

export default CheckoutPage;

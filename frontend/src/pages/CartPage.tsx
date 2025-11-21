/**
 * Cart Page
 * 
 * Shopping cart with item management and checkout button.
 */

import { useCart } from '../hooks/useCart';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { formatCurrency } from '../lib/format';
import { normalizeImageUrl, DEFAULT_PLACEHOLDER } from '../lib/imageUtils';
import { QtyInput } from '../components/QtyInput';
import { Button } from '../components/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ToastContainer } from '../components/Toast';

export function CartPage() {
  const { items, isLoading, updateItem, removeItem } = useCart();
  const { methods: paymentMethods, loading: paymentMethodsLoading } = usePaymentMethods();
  const navigate = useNavigate();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const enabledPaymentMethods = paymentMethods.filter(m => m.enabled);
  const hasPaymentMethods = enabledPaymentMethods.length > 0;

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleUpdateQty = async (productId: string, qty: number) => {
    setUpdatingItems((prev) => new Set(prev).add(productId));
    try {
      await updateItem(productId, qty);
      addToast('Cart updated', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to update cart', 'error');
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleRemove = async (productId: string, productName: string) => {
    try {
      await removeItem(productId);
      addToast(`${productName} removed from cart`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to remove item', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Your cart is empty.</p>
          <Link to="/products">
            <Button variant="primary">Continue Shopping</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="divide-y divide-gray-200">
              {items.map((item) => (
                <div key={item.productId} className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Product Image */}
                    {item.product?.images?.[0] && (
                      <Link
                        to={`/product/${item.product.slug}`}
                        className="flex-shrink-0"
                      >
                        <img
                          src={normalizeImageUrl(item.product.images[0].url) || DEFAULT_PLACEHOLDER}
                          alt={item.product.name}
                          className="w-24 h-24 object-cover rounded-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_PLACEHOLDER;
                          }}
                        />
                      </Link>
                    )}

                    {/* Product Info */}
                    <div className="flex-1">
                      <Link
                        to={`/product/${item.product?.slug || '#'}`}
                        className="text-lg font-semibold text-gray-900 hover:text-primary-600 mb-2"
                      >
                        {item.name || item.product?.name || 'Product'}
                      </Link>
                      <p className="text-gray-600 mb-4">
                        {formatCurrency(item.priceAt)} each
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4">
                        <div>
                          <label htmlFor={`qty-${item.productId}`} className="sr-only">
                            Quantity for {item.name}
                          </label>
                          <QtyInput
                            value={item.qty}
                            onChange={(qty) => handleUpdateQty(item.productId, qty)}
                            disabled={updatingItems.has(item.productId)}
                          />
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(item.priceAt * item.qty)}
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemove(item.productId, item.name || 'Item')}
                        className="text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-2"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proceed to Checkout Button */}
          <div className="flex flex-col items-end gap-3">
            {!paymentMethodsLoading && !hasPaymentMethods && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 w-full max-w-md">
                <p className="text-sm text-red-700">
                  Checkout is currently unavailable. No payment methods are enabled. Please contact support or try again later.
                </p>
              </div>
            )}
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => navigate('/checkout')}
              disabled={paymentMethodsLoading || !hasPaymentMethods}
              title={!hasPaymentMethods ? 'No payment methods available' : undefined}
            >
              Proceed to Checkout
            </Button>
          </div>
        </>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

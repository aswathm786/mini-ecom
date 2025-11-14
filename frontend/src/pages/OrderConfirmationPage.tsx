/**
 * Order Confirmation Page
 * 
 * Displays order details, payment status, invoice download, and tracking.
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { csrfFetch } from '../lib/csrfFetch';
import { formatCurrency } from '../lib/format';
import { Button } from '../components/Button';

interface Order {
  _id: string;
  userId: string;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    priceAt: number;
  }>;
  amount: number;
  currency: string;
  status: string;
  payment?: {
    status: string;
    gateway: string;
  };
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  placedAt: string;
  shipment?: {
    awb?: string;
    status?: string;
  };
}

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  // Poll order status for up to 1 minute
  useEffect(() => {
    if (!polling || !id) return;

    const maxPolls = 12; // 12 polls * 5 seconds = 60 seconds
    let pollCount = 0;

    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount >= maxPolls) {
        setPolling(false);
        clearInterval(interval);
        return;
      }

      try {
        const response = await csrfFetch(`/api/orders/${id}`);
        if (response.ok && response.data) {
          const updatedOrder = response.data as Order;
          setOrder(updatedOrder);

          // Stop polling if payment is confirmed
          if (updatedOrder.payment?.status === 'completed' || updatedOrder.payment?.status === 'failed') {
            setPolling(false);
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling order status:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [polling, id]);

  const loadOrder = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch(`/api/orders/${id}`);
      if (response.ok && response.data) {
        setOrder(response.data as Order);
      } else {
        setError(response.error || 'Order not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!id) return;

    setInvoiceGenerating(true);
    try {
      const response = await fetch(`/api/orders/${id}/invoice`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      // Try to generate invoice if download fails
      handleGenerateInvoice();
    } finally {
      setInvoiceGenerating(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!id) return;

    setInvoiceGenerating(true);
    try {
      const response = await csrfFetch(`/api/admin/orders/${id}/generate-invoice`, {
        method: 'POST',
      });

      if (response.ok) {
        // Retry download
        setTimeout(() => {
          handleDownloadInvoice();
        }, 1000);
      } else {
        throw new Error(response.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    } finally {
      setInvoiceGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  const paymentStatus = order.payment?.status || 'pending';
  const isPaymentPending = paymentStatus === 'pending' || paymentStatus === 'processing';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-md p-6 mb-8">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h2 className="text-xl font-semibold text-green-800 mb-2">Order Placed Successfully!</h2>
            <p className="text-green-700">
              Your order #{order._id} has been placed. {isPaymentPending && 'We will update you once payment is confirmed.'}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      {isPaymentPending && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Payment Pending:</strong> Your payment is being processed. We will update you when the payment is confirmed.
            {polling && ' Checking status...'}
          </p>
        </div>
      )}

      {/* Order Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Order Number</h4>
            <p className="text-gray-900">{order._id}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Order Date</h4>
            <p className="text-gray-900">
              {new Date(order.placedAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Method</h4>
            <p className="text-gray-900 capitalize">{order.payment?.gateway || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Status</h4>
            <p className="text-gray-900 capitalize">{paymentStatus}</p>
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Items</h4>
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.name} × {item.qty}
                </span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(item.priceAt * item.qty)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
        <div className="text-gray-700">
          <p className="font-medium">{order.shippingAddress.name}</p>
          <p>{order.shippingAddress.street}</p>
          <p>
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
          </p>
          <p>{order.shippingAddress.country}</p>
        </div>
      </div>

      {/* Tracking */}
      {order.shipment?.awb && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracking</h3>
          <p className="text-gray-700 mb-2">
            <strong>AWB:</strong> {order.shipment.awb}
          </p>
          <Link
            to={`/shipments/${order.shipment.awb}/track`}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Track Shipment →
          </Link>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="primary"
          onClick={handleDownloadInvoice}
          isLoading={invoiceGenerating}
          disabled={invoiceGenerating}
        >
          Download Invoice
        </Button>
        <Link to="/products">
          <Button variant="outline">Continue Shopping</Button>
        </Link>
        <Link to="/account">
          <Button variant="outline">View Orders</Button>
        </Link>
      </div>
    </div>
  );
}


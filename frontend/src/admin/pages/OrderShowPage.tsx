/**
 * Admin Order Show Page
 * 
 * Detailed order view with actions: change status, manual capture, refund, create shipment, invoice actions.
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useOrdersAdmin } from '../hooks/useOrdersAdmin';
import { OrderActions } from '../components/OrderActions';
import { formatCurrency } from '../../lib/format';
import { ToastContainer } from '../../components/Toast';

export function OrderShowPage() {
  const { id } = useParams<{ id: string }>();
  const api = useOrdersAdmin({});
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Use useOrdersAdmin hook's getOrder method when available
      const response = await fetch(`/api/admin/orders/${id}`, { credentials: 'include' });
      const data = await response.json();
      if (data.ok) {
        setOrder(data.data.order || data.data);
      } else {
        setError(data.error || 'Order not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    const success = await api.updateStatus(id!, status);
    if (success) {
      addToast('Order status updated', 'success');
      await loadOrder();
    } else {
      addToast('Failed to update order status', 'error');
    }
  };

  const handleManualCapture = async () => {
    const success = await api.manualCapture(id!);
    if (success) {
      addToast('Payment captured successfully', 'success');
      await loadOrder();
    } else {
      addToast('Failed to capture payment', 'error');
    }
  };

  const handleRefund = async (amount: number, reason: string) => {
    try {
      await api.createRefund(id!, amount, reason);
      addToast('Refund created successfully', 'success');
      await loadOrder();
    } catch (err) {
      addToast('Failed to create refund', 'error');
    }
  };

  const handleCreateShipment = async (data: any) => {
    // TODO: Implement shipment creation
    addToast('Shipment creation not yet implemented', 'warning');
  };

  const handleDownloadInvoice = async () => {
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
        a.remove();
        window.URL.revokeObjectURL(url);
        addToast('Invoice downloaded successfully', 'success');
      } else {
        throw new Error('Failed to download invoice');
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      addToast('Failed to download invoice', 'error');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <Link to="/admin/orders" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Orders
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/admin/orders" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order #{order._id.slice(-8)}</h1>
        <OrderActions
          order={order}
          onStatusChange={handleStatusChange}
          onManualCapture={handleManualCapture}
          onRefund={handleRefund}
          onCreateShipment={handleCreateShipment}
          onDownloadInvoice={handleDownloadInvoice}
        />
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{order.status}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatCurrency(order.amount)} {order.currency}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Placed At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(order.placedAt).toLocaleString('en-IN')}
            </dd>
          </div>
          {order.payment && (
            <>
              <div>
                <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{order.payment.status}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Payment Gateway</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{order.payment.gateway}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.items?.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0 last:pb-0">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-600">Qty: {item.qty} × {formatCurrency(item.priceAt)}</p>
              </div>
              <p className="font-semibold text-gray-900">{formatCurrency(item.priceAt * item.qty)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">{order.shippingAddress?.name}</p>
            <p className="mt-1">{order.shippingAddress?.street}</p>
            <p>
              {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}
            </p>
            <p>{order.shippingAddress?.country}</p>
          </div>
        </div>

        {order.billingAddress && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Address</h3>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">{order.billingAddress.name}</p>
              <p className="mt-1">{order.billingAddress.street}</p>
              <p>
                {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.pincode}
              </p>
              <p>{order.billingAddress.country}</p>
            </div>
          </div>
        )}
      </div>

      {/* Refunds */}
      {order.refunds && order.refunds.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Refunds</h2>
          <div className="space-y-2">
            {order.refunds.map((refund: any) => (
              <div key={refund._id} className="border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{formatCurrency(refund.amount)}</p>
                    <p className="text-sm text-gray-600">{refund.reason}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                    {refund.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


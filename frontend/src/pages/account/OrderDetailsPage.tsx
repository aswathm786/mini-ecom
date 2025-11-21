/**
 * Order Details Page
 * 
 * Detailed view of a single order with items, addresses, payment, shipment, and actions.
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { csrfFetch } from '../../lib/csrfFetch';
import { formatCurrency } from '../../lib/format';
import { OrderItemsList } from '../../components/account/OrderItemsList';
import { Button } from '../../components/Button';
import { TicketCreateModal } from '../../components/modals/TicketCreateModal';
import { useTickets } from '../../hooks/useTickets';
import { Order } from '../../hooks/useOrders';
import { OrderAssistPanel } from '../../components/ai/OrderAssistPanel';

interface OrderDetails extends Order {
  payment?: {
    _id: string;
    status: string;
    gateway: string;
    amount: number;
    createdAt: string;
  };
  shipment?: {
    _id: string;
    awb: string;
    status: string;
    carrier?: string;
  };
}

export function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const { createTicket } = useTickets();

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await csrfFetch(`/api/orders/${id}`);
      if (response.ok && response.data) {
        setOrder(response.data.order || response.data);
      } else {
        setError(response.error || 'Order not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!id) return;

    setDownloadingInvoice(true);
    try {
      const response = await fetch(`/api/orders/${id}/invoice`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to download invoice');
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      alert('Failed to download invoice. Please try again.');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleRequestReturn = async (data: { subject: string; message: string; attachments?: string[] }) => {
    try {
      await createTicket({
        orderId: id,
        ...data,
      });
      setShowReturnModal(false);
      // TODO: Show success toast
    } catch (error) {
      console.error('Error creating return request:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error || 'Order not found'}</p>
          <Link to="/account/orders" className="mt-4 inline-block text-primary-600 hover:underline">
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/account/orders" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadInvoice}
            isLoading={downloadingInvoice}
          >
            Download Invoice
          </Button>
          {order.status === 'delivered' && (
            <Button variant="outline" onClick={() => setShowReturnModal(true)}>
              Request Return
            </Button>
          )}
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Order #{order._id.slice(-8)}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Placed on {new Date(order.placedAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-sm font-medium rounded ${
              statusColors[order.status] || statusColors.pending
            }`}
          >
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(order.amount)} {order.currency}
            </p>
          </div>
          {order.payment && (
            <div>
              <p className="text-sm text-gray-600">Payment Status</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {order.payment.status} ({order.payment.gateway})
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-6">
        <OrderItemsList items={order.items} />
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">{order.shippingAddress.name}</p>
            <p className="mt-1">{order.shippingAddress.street}</p>
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
            </p>
            <p>{order.shippingAddress.country}</p>
          </div>
        </div>

        {order.billingAddress && (
          <div className="bg-white rounded-lg shadow-md p-6">
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

      {/* Shipment Tracking */}
      {order.shipment?.awb && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipment Tracking</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">AWB Number</p>
              <p className="font-mono text-lg font-semibold text-gray-900">{order.shipment.awb}</p>
              {order.shipment.status && (
                <p className="text-sm text-gray-600 mt-1">Status: {order.shipment.status}</p>
              )}
            </div>
            <Link
              to={`/account/tracking/${order.shipment.awb}`}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Track Shipment →
            </Link>
          </div>
        </div>
      )}

      {/* Refunds */}
      {order.refunds && order.refunds.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Refunds</h3>
          <div className="space-y-2">
            {order.refunds.map((refund) => (
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

      <OrderAssistPanel />

      <TicketCreateModal
        isOpen={showReturnModal}
        orderId={id}
        onClose={() => setShowReturnModal(false)}
        onSubmit={handleRequestReturn}
      />
    </div>
  );
}


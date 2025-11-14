/**
 * Order Row Component
 * 
 * Displays order summary in a list row format.
 */

import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/format';
import { Order } from '../../hooks/useOrders';

interface OrderRowProps {
  order: Order;
}

export function OrderRow({ order }: OrderRowProps) {
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
    <Link
      to={`/account/orders/${order._id}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-900">Order #{order._id.slice(-8)}</span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                statusColors[order.status] || statusColors.pending
              }`}
            >
              {order.status}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {order.items.length} item{order.items.length !== 1 ? 's' : ''} •{' '}
            {new Date(order.placedAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(order.amount)}
          </div>
          {order.shipment?.awb && (
            <div className="text-xs text-primary-600 mt-1">Track: {order.shipment.awb}</div>
          )}
        </div>
      </div>
    </Link>
  );
}


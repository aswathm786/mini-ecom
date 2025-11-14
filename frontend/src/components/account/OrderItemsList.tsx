/**
 * Order Items List Component
 * 
 * Displays order items in a detailed list format.
 */

import { formatCurrency } from '../../lib/format';
import { OrderItem } from '../../hooks/useOrders';

interface OrderItemsListProps {
  items: OrderItem[];
}

export function OrderItemsList({ items }: OrderItemsListProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {items.map((item, index) => (
            <div key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Quantity: {item.qty} × {formatCurrency(item.priceAt)}
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(item.priceAt * item.qty)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


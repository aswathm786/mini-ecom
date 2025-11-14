/**
 * Account Home Page
 * 
 * Dashboard/overview page for user account section.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { useTickets } from '../../hooks/useTickets';

export function AccountHome() {
  const { user } = useAuth();
  const { orders } = useOrders({ limit: 5 });
  const { tickets } = useTickets();

  const recentTickets = tickets.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/account/profile"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile</h3>
          <p className="text-sm text-gray-600">Manage your personal information</p>
        </Link>

        <Link
          to="/account/orders"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Orders</h3>
          <p className="text-sm text-gray-600">
            {orders.length > 0 ? `${orders.length} recent orders` : 'View your orders'}
          </p>
        </Link>

        <Link
          to="/account/addresses"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Addresses</h3>
          <p className="text-sm text-gray-600">Manage shipping addresses</p>
        </Link>

        <Link
          to="/account/tickets"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Support Tickets</h3>
          <p className="text-sm text-gray-600">
            {recentTickets.length > 0 ? `${recentTickets.length} active tickets` : 'Get help'}
          </p>
        </Link>

        <Link
          to="/account/sessions"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sessions</h3>
          <p className="text-sm text-gray-600">Manage active sessions</p>
        </Link>
      </div>

      {/* Recent Orders */}
      {orders.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/account/orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 3).map((order) => (
              <Link
                key={order._id}
                to={`/account/orders/${order._id}`}
                className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Order #{order._id.slice(-8)}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(order.placedAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div className="text-gray-900 font-medium">{order.status}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


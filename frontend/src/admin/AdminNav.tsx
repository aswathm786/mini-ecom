/**
 * Admin Navigation Component
 * 
 * Sidebar navigation for admin dashboard.
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/orders', label: 'Orders', icon: '📦' },
  { path: '/admin/refunds', label: 'Refunds', icon: '💰' },
  { path: '/admin/shipments', label: 'Shipments', icon: '🚚' },
  { path: '/admin/catalog', label: 'Catalog', icon: '📚' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/roles', label: 'Roles', icon: '🔐' },
  { path: '/admin/support/tickets', label: 'Support Tickets', icon: '🎫' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
  { path: '/admin/webhooks', label: 'Webhooks', icon: '🔗' },
  { path: '/admin/audit', label: 'Audit Logs', icon: '📋' },
  { path: '/admin/reports', label: 'Reports', icon: '📈' },
];

export function AdminNav() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center w-full">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-medium">
                    {user?.firstName?.[0] || user?.email?.[0] || 'A'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || 'Admin'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


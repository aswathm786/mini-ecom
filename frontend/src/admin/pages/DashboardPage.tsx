/**
 * Admin Dashboard Page
 * 
 * Overview with key metrics, charts, and alerts.
 */

import { useEffect, useState } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
}

export function DashboardPage() {
  const api = useAdminApi();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // TODO: Implement /api/admin/dashboard/stats endpoint
      const data = await api.get<DashboardStats>('/dashboard/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalOrders || 0}</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₹{stats?.totalRevenue?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.pendingOrders || 0}</p>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.lowStockProducts || 0}</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/admin/orders"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="text-2xl mb-2">📦</div>
            <div className="text-sm font-medium text-gray-700">View Orders</div>
          </Link>
          <Link
            to="/admin/catalog"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="text-2xl mb-2">📚</div>
            <div className="text-sm font-medium text-gray-700">Manage Catalog</div>
          </Link>
          <Link
            to="/admin/users"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium text-gray-700">Manage Users</div>
          </Link>
          <Link
            to="/admin/reports"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <div className="text-2xl mb-2">📈</div>
            <div className="text-sm font-medium text-gray-700">View Reports</div>
          </Link>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats && stats.lowStockProducts > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">
                {stats.lowStockProducts} product{stats.lowStockProducts !== 1 ? 's' : ''} running low on stock
              </p>
            </div>
            <Link
              to="/admin/catalog"
              className="text-sm text-yellow-700 hover:text-yellow-900 font-medium"
            >
              View Catalog →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}


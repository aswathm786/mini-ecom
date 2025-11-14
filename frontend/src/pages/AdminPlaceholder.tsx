/**
 * Admin Placeholder Page
 * 
 * Admin dashboard placeholder - will be fleshed out in later parts.
 */

import { useAuth } from '../contexts/AuthContext';

export function AdminPlaceholder() {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <p className="text-gray-600">
          Admin panel with product management, order management, and analytics
          will be implemented in later parts.
        </p>
      </div>
    </div>
  );
}


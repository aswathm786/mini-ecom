/**
 * Admin Layout Component
 * 
 * Main layout wrapper for admin pages with sidebar navigation.
 */

import { ReactNode } from 'react';
import { AdminNav } from './AdminNav';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuthenticated } = useAuth();

  // Check if user has admin role
  const hasAdminAccess = () => {
    if (!user) return false;
    const roles = user.role ? [user.role] : [];
    // TODO: Check user.roles array if available from API
    return roles.some((r) => ['admin', 'manager', 'root'].includes(r.toLowerCase()));
  };

  if (!isAuthenticated) {
    return <Navigate to="/login?return=/admin" replace />;
  }

  if (!hasAdminAccess()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="lg:pl-64">
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


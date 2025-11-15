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
  const { user, isAuthenticated, isLoading } = useAuth();

  // Check if user has admin role
  const hasAdminAccess = () => {
    if (!user) return false;
    const roles = user.role ? [user.role] : [];
    // Check for admin, root, or manager roles
    return roles.some((r) => ['admin', 'root', 'manager'].includes(r?.toLowerCase()));
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login?return=/admin" replace />;
  }

  // Redirect to account page if authenticated but not admin
  if (!hasAdminAccess()) {
    return (
      <Navigate 
        to="/account?error=admin_access_denied" 
        replace 
        state={{ message: 'You do not have permission to access the admin area.' }}
      />
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


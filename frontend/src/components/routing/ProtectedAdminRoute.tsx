import { ReactNode, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminForbiddenPage } from '../../pages/AdminForbiddenPage';

const ADMIN_ROLES = new Set(['root', 'admin', 'manager', 'support', 'administrator']);

interface Props {
  children: ReactNode;
}

export function ProtectedAdminRoute({ children }: Props) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
        Checking permissions…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login?redirect=/admin" replace />;
  }

  // Check if user has admin access (same logic as AdminLayout)
  const hasAdminAccess = () => {
    if (!user) return false;
    const roles = user.roles || (user.role ? [user.role] : []);
    // Check for admin, root, or any role that has admin permissions
    const hasAdminRole = roles.some((r) => 
      ['admin', 'root', 'administrator'].includes(r?.toLowerCase())
    );
    // Also check if user has any permissions (means they have a role with permissions)
    const hasPermissions = user.permissions && user.permissions.length > 0;
    return hasAdminRole || hasPermissions;
  };

  if (!hasAdminAccess()) {
    return <AdminForbiddenPage />;
  }

  return <Suspense fallback={<div className="p-6">Loading admin console…</div>}>{children}</Suspense>;
}



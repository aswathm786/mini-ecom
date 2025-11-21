/**
 * Protected Admin Page Component
 * 
 * Wraps admin pages to check permissions before rendering.
 * Redirects to forbidden page if user lacks required permissions.
 * Logs unauthorized access attempts to the database.
 */

import { ReactNode, useEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminForbiddenPage } from '../../pages/AdminForbiddenPage';
import { getRoutePermissions, canAccessRoute } from '../../admin/config/routes';
import { csrfFetch } from '../../lib/csrfFetch';

interface Props {
  children: ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  anyPermission?: boolean;
}

export function ProtectedAdminPage({ 
  children, 
  requiredPermissions = [],
  requiredRoles = [],
  anyPermission = false 
}: Props) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    // Get route permissions from config if not provided as props
    const routeConfig = getRoutePermissions(location.pathname);
    const permissions = requiredPermissions.length > 0 
      ? requiredPermissions 
      : (routeConfig?.requiredPermissions || []);
    const roles = requiredRoles.length > 0 
      ? requiredRoles 
      : (routeConfig?.requiredRoles || []);
    const anyPerm = routeConfig?.anyPermission ?? anyPermission;

    const userRoles = user.roles || (user.role ? [user.role] : []);
    const userPermissions = user.permissions || [];

    // Check if user has access
    const config = {
      path: location.pathname,
      requiredPermissions: permissions,
      requiredRoles: roles,
      anyPermission: anyPerm,
    };

    const canAccess = canAccessRoute(config, userRoles, userPermissions);
    setHasAccess(canAccess);

    // Log unauthorized access attempt
    if (!canAccess) {
      logUnauthorizedAccess(location.pathname, permissions, roles, userRoles, userPermissions);
    }

    setAccessChecked(true);
  }, [isLoading, user, location.pathname, requiredPermissions, requiredRoles, anyPermission]);

  const logUnauthorizedAccess = async (
    path: string,
    requiredPerms: string[],
    requiredRoles: string[],
    userRoles: string[],
    userPermissions: string[]
  ) => {
    try {
      // Use csrfFetch to log the access attempt
      await csrfFetch('/api/admin/audit/log-access-attempt', {
        method: 'POST',
        body: JSON.stringify({
          path,
          requiredPermissions: requiredPerms,
          requiredRoles,
          userRoles,
          userPermissions,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to log unauthorized access attempt:', error);
      // Don't block the UI if logging fails
    }
  };

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

  if (!accessChecked) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
        Checking permissions…
      </div>
    );
  }

  if (!hasAccess) {
    return <AdminForbiddenPage />;
  }

  return <>{children}</>;
}


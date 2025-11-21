/**
 * Admin Routes Permission Mapping (Frontend)
 * 
 * Defines which permissions are required to access each admin route.
 * Used by frontend components to filter navigation and protect routes.
 */

export interface RoutePermissionConfig {
  path: string;
  label: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  anyPermission?: boolean; // If true, user needs ANY of the permissions, not ALL
}

/**
 * Mapping of admin routes to their required permissions/roles
 * This should match the backend mapping in backend/src/config/adminRoutes.ts
 */
export const ADMIN_ROUTE_PERMISSIONS: RoutePermissionConfig[] = [
  // Dashboard - accessible to all admins
  { path: '/admin', label: 'Dashboard', requiredPermissions: [] },
  
  // Orders
  { path: '/admin/orders', label: 'Orders', requiredPermissions: ['orders.view'] },
  { path: '/admin/orders/:id', label: 'Order Details', requiredPermissions: ['orders.view'] },
  
  // Refunds
  { path: '/admin/refunds', label: 'Refunds', requiredPermissions: ['refunds.manage'] },
  
  // Shipments
  { path: '/admin/shipments', label: 'Shipments', requiredPermissions: ['orders.manage'] },
  
  // Catalog
  { path: '/admin/catalog', label: 'Catalog', requiredPermissions: ['catalog.view', 'catalog.manage'], anyPermission: true },
  { path: '/admin/catalog/new', label: 'New Product', requiredPermissions: ['catalog.manage'] },
  { path: '/admin/catalog/:id/edit', label: 'Edit Product', requiredPermissions: ['catalog.manage'] },
  
  // Categories
  { path: '/admin/categories', label: 'Categories', requiredPermissions: ['catalog.manage'] },
  
  // Users
  { path: '/admin/users', label: 'Users', requiredPermissions: ['users.view'] },
  { path: '/admin/users/:id', label: 'User Details', requiredPermissions: ['users.view'] },
  
  // Roles - admin/root only
  { path: '/admin/roles', label: 'Roles', requiredRoles: ['admin', 'root', 'administrator'] },
  
  // Settings
  { path: '/admin/settings', label: 'Settings', requiredPermissions: ['settings.manage'], requiredRoles: ['admin', 'root', 'administrator'], anyPermission: true },
  
  // Theme
  { path: '/admin/theme', label: 'Theme & Design', requiredPermissions: ['settings.manage'] },
  
  // Webhooks
  { path: '/admin/webhooks', label: 'Webhooks', requiredPermissions: ['webhooks.manage'] },
  
  // Audit Logs - admin/root only
  { path: '/admin/audit', label: 'Audit Logs', requiredRoles: ['admin', 'root', 'administrator'] },
  
  // Reports - accessible to all admins
  { path: '/admin/reports', label: 'Reports', requiredPermissions: [] },
  
  // AI Studio - accessible to all admins
  { path: '/admin/ai', label: 'AI Studio', requiredPermissions: [] },
  
  // Security - admin/root only
  { path: '/admin/security', label: 'Security', requiredRoles: ['admin', 'root', 'administrator'] },
  
  // Marketing
  { path: '/admin/marketing', label: 'Marketing', requiredPermissions: ['marketing.manage'] },
  
  // Email Templates - accessible to all admins
  { path: '/admin/email-templates', label: 'Email Templates', requiredPermissions: [] },
  
  // Countries - accessible to all admins
  { path: '/admin/countries', label: 'Countries', requiredPermissions: [] },
  
  // Database Schema - admin/root only
  { path: '/admin/schema', label: 'Database Schema', requiredRoles: ['admin', 'root', 'administrator'] },
  
  // Invoices
  { path: '/admin/invoices/:orderId', label: 'Invoice', requiredPermissions: ['orders.view'] },
  
  // Support Tickets - accessible to all admins
  { path: '/admin/support/tickets', label: 'Support Tickets', requiredPermissions: [] },
  { path: '/admin/support/tickets/:id', label: 'Ticket Details', requiredPermissions: [] },
];

/**
 * Get permission requirements for a route
 */
export function getRoutePermissions(path: string): RoutePermissionConfig | null {
  // Try exact match first
  let config = ADMIN_ROUTE_PERMISSIONS.find(r => r.path === path);
  
  if (config) return config;
  
  // Try pattern matching for routes with parameters
  for (const route of ADMIN_ROUTE_PERMISSIONS) {
    const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${routePattern}$`);
    if (regex.test(path)) {
      return route;
    }
  }
  
  return null;
}

/**
 * Check if user has access to a route
 */
export function canAccessRoute(
  routeConfig: RoutePermissionConfig,
  userRoles: string[],
  userPermissions: string[]
): boolean {
  // If no requirements, allow access
  if (!routeConfig.requiredPermissions?.length && !routeConfig.requiredRoles?.length) {
    return true;
  }
  
  // Check for root permission
  if (userPermissions.includes('*')) {
    return true;
  }
  
  // Check required roles
  if (routeConfig.requiredRoles && routeConfig.requiredRoles.length > 0) {
    const hasRequiredRole = userRoles.some(role =>
      routeConfig.requiredRoles!.some(reqRole =>
        role?.toLowerCase() === reqRole.toLowerCase()
      )
    );
    if (!hasRequiredRole) return false;
  }
  
  // Check required permissions
  if (routeConfig.requiredPermissions && routeConfig.requiredPermissions.length > 0) {
    if (routeConfig.anyPermission) {
      // User needs ANY of the permissions
      const hasAnyPermission = routeConfig.requiredPermissions.some(perm =>
        userPermissions.includes(perm)
      );
      if (!hasAnyPermission) return false;
    } else {
      // User needs ALL of the permissions
      const hasAllPermissions = routeConfig.requiredPermissions.every(perm =>
        userPermissions.includes(perm)
      );
      if (!hasAllPermissions) return false;
    }
  }
  
  return true;
}


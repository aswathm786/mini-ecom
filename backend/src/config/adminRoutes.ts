/**
 * Admin Routes Permission Mapping
 * 
 * Defines which permissions are required to access each admin route.
 * Used by backend middleware to enforce access control.
 */

export interface RoutePermissionConfig {
  path: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  anyPermission?: boolean; // If true, user needs ANY of the permissions, not ALL
}

/**
 * Mapping of admin routes to their required permissions/roles
 */
export const ADMIN_ROUTE_PERMISSIONS: RoutePermissionConfig[] = [
  // Dashboard - accessible to all admins
  { path: '/admin', requiredPermissions: [] },
  
  // Orders
  { path: '/admin/orders', requiredPermissions: ['orders.view'] },
  { path: '/admin/orders/:id', requiredPermissions: ['orders.view'] },
  
  // Refunds
  { path: '/admin/refunds', requiredPermissions: ['refunds.manage'] },
  
  // Shipments
  { path: '/admin/shipments', requiredPermissions: ['orders.manage'] },
  
  // Catalog
  { path: '/admin/catalog', requiredPermissions: ['catalog.view', 'catalog.manage'], anyPermission: true },
  { path: '/admin/catalog/new', requiredPermissions: ['catalog.manage'] },
  { path: '/admin/catalog/:id/edit', requiredPermissions: ['catalog.manage'] },
  
  // Categories
  { path: '/admin/categories', requiredPermissions: ['catalog.manage'] },
  
  // Users
  { path: '/admin/users', requiredPermissions: ['users.view'] },
  { path: '/admin/users/:id', requiredPermissions: ['users.view'] },
  
  // Roles - admin/root only
  { path: '/admin/roles', requiredRoles: ['admin', 'root', 'administrator'] },
  
  // Settings
  { path: '/admin/settings', requiredPermissions: ['settings.manage'], requiredRoles: ['admin', 'root', 'administrator'], anyPermission: true },
  
  // Theme
  { path: '/admin/theme', requiredPermissions: ['settings.manage'] },
  
  // Webhooks
  { path: '/admin/webhooks', requiredPermissions: ['webhooks.manage'] },
  
  // Audit Logs - admin/root only
  { path: '/admin/audit', requiredRoles: ['admin', 'root', 'administrator'] },
  
  // Reports - accessible to all admins
  { path: '/admin/reports', requiredPermissions: [] },
  
  // AI Studio - accessible to all admins (or can add specific permission later)
  { path: '/admin/ai', requiredPermissions: [] },
  
  // Security - admin/root only
  { path: '/admin/security', requiredRoles: ['admin', 'root', 'administrator'] },
  
  // Marketing
  { path: '/admin/marketing', requiredPermissions: ['marketing.manage'] },
  
  // Email Templates - accessible to all admins
  { path: '/admin/email-templates', requiredPermissions: [] },
  
  // Countries - accessible to all admins
  { path: '/admin/countries', requiredPermissions: [] },
  
  // Database Schema - admin/root only
  { path: '/admin/schema', requiredRoles: ['admin', 'root', 'administrator'] },
  
  // Invoices
  { path: '/admin/invoices/:orderId', requiredPermissions: ['orders.view'] },
  
  // Support Tickets - accessible to all admins
  { path: '/admin/support/tickets', requiredPermissions: [] },
  { path: '/admin/support/tickets/:id', requiredPermissions: [] },
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


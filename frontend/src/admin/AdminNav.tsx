/**
 * Admin Navigation Component
 * 
 * Sidebar navigation for admin dashboard.
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiGrid, 
  FiPackage, 
  FiDollarSign, 
  FiTruck, 
  FiBook, 
  FiTag, 
  FiUsers, 
  FiShield, 
  FiMessageSquare, 
  FiSettings, 
  FiImage, 
  FiLink, 
  FiFileText, 
  FiBarChart2, 
  FiCpu, 
  FiLock, 
  FiVolume2, 
  FiMail,
  FiLogOut,
  FiGlobe,
  FiDatabase
} from 'react-icons/fi';

interface NavItem {
  path: string;
  label: string;
  icon: any;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  anyRole?: boolean; // If true, user needs any of the roles, not all
}

const navItems: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: FiGrid },
  { path: '/admin/orders', label: 'Orders', icon: FiPackage, requiredPermissions: ['orders.view'] },
  { path: '/admin/refunds', label: 'Refunds', icon: FiDollarSign, requiredPermissions: ['refunds.manage'] },
  { path: '/admin/shipments', label: 'Shipments', icon: FiTruck, requiredPermissions: ['orders.manage'] },
  { path: '/admin/catalog', label: 'Catalog', icon: FiBook, requiredPermissions: ['catalog.view', 'catalog.manage'], anyRole: true },
  { path: '/admin/categories', label: 'Categories', icon: FiTag, requiredPermissions: ['catalog.manage'] },
  { path: '/admin/users', label: 'Users', icon: FiUsers, requiredPermissions: ['users.view'] },
  { path: '/admin/roles', label: 'Roles', icon: FiShield, requiredRoles: ['admin', 'root', 'administrator'] },
  { path: '/admin/support/tickets', label: 'Support Tickets', icon: FiMessageSquare },
  { path: '/admin/settings', label: 'Settings', icon: FiSettings, requiredPermissions: ['settings.manage'], requiredRoles: ['admin', 'root', 'administrator'], anyRole: true },
  { path: '/admin/store-settings', label: 'Store Branding', icon: FiImage, requiredPermissions: ['settings.manage'], requiredRoles: ['admin', 'root', 'administrator'], anyRole: true },
  { path: '/admin/tax-shipping', label: 'Tax & Shipping', icon: FiDollarSign, requiredPermissions: ['settings.manage'], requiredRoles: ['admin', 'root', 'administrator'], anyRole: true },
  { path: '/admin/theme', label: 'Theme & Design', icon: FiImage, requiredPermissions: ['settings.manage'] },
  { path: '/admin/webhooks', label: 'Webhooks', icon: FiLink, requiredPermissions: ['webhooks.manage'] },
  { path: '/admin/audit', label: 'Audit Logs', icon: FiFileText, requiredRoles: ['admin', 'root', 'administrator'] },
  { path: '/admin/reports', label: 'Reports', icon: FiBarChart2 },
  { path: '/admin/ai', label: 'AI Studio', icon: FiCpu },
  { path: '/admin/ai/settings', label: 'AI Settings', icon: FiSettings, requiredRoles: ['admin', 'root', 'administrator'] },
  { path: '/admin/security', label: 'Security', icon: FiLock, requiredRoles: ['admin', 'root', 'administrator'] },
  { path: '/admin/marketing', label: 'Marketing', icon: FiVolume2, requiredPermissions: ['marketing.manage'] },
  { path: '/admin/coupons', label: 'Coupons', icon: FiTag, requiredPermissions: ['marketing.manage'] },
  { path: '/admin/email-templates', label: 'Email Templates', icon: FiMail },
  { path: '/admin/countries', label: 'Countries', icon: FiGlobe },
  { path: '/admin/schema', label: 'Database Schema', icon: FiDatabase, requiredRoles: ['admin', 'root', 'administrator'] },
];

export function AdminNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Check if user can access a nav item based on database permissions
  const canAccessItem = (item: NavItem): boolean => {
    if (!user) return false;
    
    // Get user roles and permissions from database (loaded via /api/me)
    const userRoles = user.roles || (user.role ? [user.role] : []);
    const userPermissions = user.permissions || [];
    
    // Check if user has '*' permission (root access) - grants all permissions
    if (userPermissions.includes('*')) return true;
    
    // If no requirements specified, allow access (for items like Dashboard, Reports, etc.)
    if (!item.requiredRoles && !item.requiredPermissions) {
      return true;
    }
    
    // Check required roles (case-insensitive)
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      const hasRequiredRole = userRoles.some(role => 
        item.requiredRoles!.some(reqRole => 
          role?.toLowerCase() === reqRole.toLowerCase()
        )
      );
      if (!hasRequiredRole) return false;
    }
    
    // Check required permissions
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      if (item.anyRole) {
        // User needs ANY of the permissions (OR logic)
        const hasAnyPermission = item.requiredPermissions.some(perm => 
          userPermissions.includes(perm)
        );
        if (!hasAnyPermission) return false;
      } else {
        // User needs ALL of the permissions (AND logic) - but for nav items, we use OR
        // Actually, for navigation, we typically want OR (any permission grants access)
        const hasAnyPermission = item.requiredPermissions.some(perm => 
          userPermissions.includes(perm)
        );
        if (!hasAnyPermission) return false;
      }
    }
    
    return true;
  };

  // Filter nav items based on user permissions
  const visibleNavItems = navItems.filter(canAccessItem);

  return (
    <div className="hidden lg:block lg:flex-shrink-0 lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:w-64">
      <div className="flex flex-col h-full bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {visibleNavItems.map((item) => {
            const IconComponent = item.icon;
            const isRootDashboard = item.path === '/admin';
            const isActive = isRootDashboard
              ? location.pathname === '/admin'
              : location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);
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
                <IconComponent className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-4 mt-auto space-y-2">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 font-medium">
                {user?.firstName?.[0] || user?.email?.[0] || 'A'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || 'Admin'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
          >
            <FiLogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}


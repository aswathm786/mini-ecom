/**
 * Global Layout Component
 * 
 * Provides consistent header, footer, and navigation across all pages.
 * Includes mobile-responsive menu and accessibility features.
 */

import { ReactNode, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { useCart } from '../hooks/useCart';
import { Logo } from '../components/Logo';
import { Nav } from '../components/Nav';
import { IconCart } from '../components/IconCart';
import { FiHome, FiGrid, FiShoppingCart, FiUser, FiSettings, FiLogIn, FiLogOut } from 'react-icons/fi';

interface GlobalLayoutProps {
  children: ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { settings: themeSettings } = useTheme();
  const { settings: storeSettings } = useStoreSettings();
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use store settings from store branding page first, fallback to theme settings, then default
  // This ensures the tab title uses the store name configured in the admin store branding page
  const siteName = storeSettings?.name || themeSettings?.['store.name'] || themeSettings?.['site.name'] || 'Handmade Harmony';
  const siteTagline = storeSettings?.tagline || themeSettings?.['theme.siteTagline'] || 'Beautiful handmade products';
  const storeLogo = storeSettings?.logo;
  const storeFavicon = storeSettings?.favicon;

  // Update browser tab title with store name from store branding page
  // This will automatically update when store settings change
  useEffect(() => {
    if (siteName) {
      document.title = siteName;
    }
  }, [siteName]);

  // Update favicon from store branding settings
  useEffect(() => {
    if (storeFavicon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = storeFavicon;
    }
  }, [storeFavicon]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3" aria-label={`${siteName} Home`}>
              {storeLogo ? (
                <img 
                  src={storeLogo} 
                  alt={siteName}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <Logo />
              )}
              <div className="hidden sm:block">
                <div className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                  {siteName}
                </div>
                {siteTagline && (
                  <div className="text-xs text-gray-500">{siteTagline}</div>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex md:items-center md:space-x-6" aria-label="Main navigation">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  [
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600',
                  ].join(' ')
                }
              >
                <FiHome className="h-4 w-4" />
                Home
              </NavLink>
              <NavLink
                to="/categories"
                className={({ isActive }) =>
                  [
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600',
                  ].join(' ')
                }
              >
                <FiGrid className="h-4 w-4" />
                Categories
              </NavLink>
              <NavLink
                to="/cart"
                className={({ isActive }) =>
                  [
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600',
                  ].join(' ')
                }
              >
                <span className="relative">
                  <IconCart />
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem]">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </span>
                Cart
              </NavLink>
              {isAuthenticated ? (
                <>
                  <NavLink
                    to="/account"
                    className={({ isActive }) =>
                      [
                        'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                        isActive || location.pathname.startsWith('/account/')
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600',
                      ].join(' ')
                    }
                  >
                    <FiUser className="h-4 w-4" />
                    Account
                  </NavLink>
                  {(user?.role === 'admin' || user?.role === 'root' || (user?.roles && user.roles.some(r => ['admin', 'root', 'administrator'].includes(r?.toLowerCase()))) || (user?.permissions && user.permissions.length > 0)) && (
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        [
                          'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                          isActive || location.pathname.startsWith('/admin')
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600',
                        ].join(' ')
                      }
                    >
                      <FiSettings className="h-4 w-4" />
                      Admin
                    </NavLink>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  >
                    <FiLogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-75 hover:bg-gray-50 flex items-center gap-1"
                  style={{ color: 'var(--color-text, #374151)' }}
                >
                  <FiLogIn className="h-4 w-4" />
                  Login
                </Link>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <Nav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className={`flex-1 ${location.pathname.startsWith('/admin') ? 'bg-gray-50' : ''}`}
      >
        {children}
      </main>

      {/* Footer */}
      <footer 
        className={`mt-auto ${location.pathname.startsWith('/admin') ? 'lg:pl-64' : ''}`}
        style={{ 
          backgroundColor: themeSettings?.['theme.secondary'] || '#111827',
          color: '#FFFFFF'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {themeSettings?.['theme.footerImage'] && (
            <div className="mb-8">
              <img 
                src={themeSettings['theme.footerImage']} 
                alt="Footer"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">{siteName}</h3>
              <p className="text-gray-400 text-sm">
                {siteTagline}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/#categories" className="text-gray-400 hover:text-white transition-colors">
                    Categories
                  </Link>
                </li>
                <li>
                  <Link to="/cart" className="text-gray-400 hover:text-white transition-colors">
                    Cart
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/account" className="text-gray-400 hover:text-white transition-colors">
                    My Account
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

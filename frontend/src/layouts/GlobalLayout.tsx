/**
 * Global Layout Component
 * 
 * Provides consistent header, footer, and navigation across all pages.
 * Includes mobile-responsive menu and accessibility features.
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Logo } from '../components/Logo';
import { Nav } from '../components/Nav';
import { IconCart } from '../components/IconCart';
import { AIChat } from '../components/AIChat';

interface GlobalLayoutProps {
  children: ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const { settings } = useTheme();
  const location = useLocation();
  
  const siteName = settings?.['theme.siteName'] || 'Handmade Harmony';
  const siteTagline = settings?.['theme.siteTagline'] || 'Beautiful handmade products';

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
              {settings?.['theme.logo'] ? (
                <img 
                  src={settings['theme.logo']} 
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
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'bg-opacity-10'
                    : 'hover:opacity-75 hover:bg-gray-50'
                }`}
                style={location.pathname === '/' ? {
                  color: 'var(--color-primary, #dc2626)',
                  backgroundColor: 'var(--color-primary, #dc2626)',
                } : {
                  color: 'var(--color-text, #374151)',
                }}
              >
                Home
              </Link>
              <Link
                to="/#categories"
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-75 hover:bg-gray-50"
                style={{ color: 'var(--color-text, #374151)' }}
              >
                Categories
              </Link>
              <Link
                to="/cart"
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-75 hover:bg-gray-50 flex items-center gap-1"
                style={{ color: 'var(--color-text, #374151)' }}
              >
                <IconCart />
                Cart
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/account"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === '/account'
                        ? 'bg-opacity-10'
                        : 'hover:opacity-75 hover:bg-gray-50'
                    }`}
                    style={location.pathname === '/account' ? {
                      color: 'var(--color-primary, #dc2626)',
                      backgroundColor: 'var(--color-primary, #dc2626)',
                    } : {
                      color: 'var(--color-text, #374151)',
                    }}
                  >
                    Account
                  </Link>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-75 hover:bg-gray-50"
                  style={{ color: 'var(--color-text, #374151)' }}
                >
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
      <main id="main-content" className="flex-1">
        {children}
      </main>

      {/* AI Chat Widget */}
      <AIChat />

      {/* Footer */}
      <footer 
        className="mt-auto"
        style={{ 
          backgroundColor: settings?.['theme.secondary'] || '#111827',
          color: '#FFFFFF'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {settings?.['theme.footerImage'] && (
            <div className="mb-8">
              <img 
                src={settings['theme.footerImage']} 
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
            <p>&copy; {new Date().getFullYear()} Handmade Harmony. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

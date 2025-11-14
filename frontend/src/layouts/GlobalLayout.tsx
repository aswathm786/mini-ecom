/**
 * Global Layout Component
 * 
 * Provides consistent header, footer, and navigation across all pages.
 * Includes mobile-responsive menu and accessibility features.
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { Nav } from '../components/Nav';
import { IconCart } from '../components/IconCart';

interface GlobalLayoutProps {
  children: ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

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
            <Link to="/" className="flex items-center" aria-label="Handmade Harmony Home">
              <Logo />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex md:items-center md:space-x-6" aria-label="Main navigation">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                Home
              </Link>
              <Link
                to="/#categories"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors"
              >
                Categories
              </Link>
              <Link
                to="/cart"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
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
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                  >
                    Account
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        location.pathname.startsWith('/admin')
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                      }`}
                    >
                      Admin
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors"
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

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Handmade Harmony</h3>
              <p className="text-gray-400 text-sm">
                Curated handcrafted treasures for your home and lifestyle.
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

/**
 * Navigation Component
 * 
 * Mobile-responsive navigation menu with hamburger toggle.
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IconCart } from './IconCart';

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div className="fixed top-0 right-0 bottom-0 w-64 bg-white shadow-xl">
            <nav
              className="flex flex-col p-4 space-y-2"
              aria-label="Mobile navigation"
            >
              <Link
                to="/"
                onClick={closeMenu}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                Home
              </Link>
              <Link
                to="/#categories"
                onClick={closeMenu}
                className="px-4 py-2 rounded-md font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors"
              >
                Categories
              </Link>
              <Link
                to="/cart"
                onClick={closeMenu}
                className="px-4 py-2 rounded-md font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <IconCart />
                Cart
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/account"
                    onClick={closeMenu}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
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
                      onClick={closeMenu}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        location.pathname.startsWith('/admin')
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                      }`}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      await logout();
                      closeMenu();
                    }}
                    className="px-4 py-2 rounded-md font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="px-4 py-2 rounded-md font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors"
                >
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}


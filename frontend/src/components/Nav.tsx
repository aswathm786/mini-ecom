/**
 * Navigation Component
 * 
 * Mobile-responsive navigation menu with hamburger toggle.
 */

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { IconCart } from './IconCart';

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
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
              <NavLink
                to="/"
                end
                onClick={closeMenu}
                className={({ isActive }) =>
                  [
                    'px-4 py-2 rounded-md font-medium transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
                  ].join(' ')
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/categories"
                onClick={closeMenu}
                className={({ isActive }) =>
                  [
                    'px-4 py-2 rounded-md font-medium transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
                  ].join(' ')
                }
              >
                Categories
              </NavLink>
              <NavLink
                to="/cart"
                onClick={closeMenu}
                className={({ isActive }) =>
                  [
                    'px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
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
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      [
                        'px-4 py-2 rounded-md font-medium transition-colors',
                        isActive || location.pathname.startsWith('/account')
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
                      ].join(' ')
                    }
                  >
                    Account
                  </NavLink>
                  {(user?.role === 'admin' || user?.role === 'root' || (user?.roles && user.roles.some(r => ['admin', 'root', 'administrator'].includes(r?.toLowerCase()))) || (user?.permissions && user.permissions.length > 0)) && (
                    <NavLink
                      to="/admin"
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        [
                          'px-4 py-2 rounded-md font-medium transition-colors',
                          isActive || location.pathname.startsWith('/admin')
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
                        ].join(' ')
                      }
                    >
                      Admin
                    </NavLink>
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
                <NavLink
                  to="/login"
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    [
                      'px-4 py-2 rounded-md font-medium transition-colors',
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
                    ].join(' ')
                  }
                >
                  Login
                </NavLink>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

export default Nav;


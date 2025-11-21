/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * Handles login, logout, registration, and session management.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean, twoFACode?: string) => Promise<void>;
  loginWithGoogle: (idToken: string, rememberMe?: boolean, twoFACode?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshUser: (silent?: boolean) => Promise<void>;
  listSessions: (userId: string) => Promise<any[]>;
  revokeSession: (userId: string, sessionId: string) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'handmade_harmony_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount and verify session
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check localStorage first - if no user stored, skip API call to avoid 401 console error
        const storedUser = localStorage.getItem(STORAGE_KEY);
        if (!storedUser) {
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        // First, try to refresh user from API (this will use cookies)
        // Note: 401 is expected for unauthenticated users - this is normal behavior
        const response = await csrfFetch('/api/me');
        if (response.ok && response.data) {
          const userData: User = {
            id: response.data.user.id,
            email: response.data.user.email,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            role: response.data.user.role,
            roles: response.data.user.roles || [],
            permissions: response.data.user.permissions || [],
          };
          setUser(userData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
          setIsLoading(false);
          return;
        }
        
        // If API call fails with 429 (rate limited), keep user from localStorage
        if (response.code === 'RATE_LIMITED') {
          // Rate limited - keep user in localStorage, don't clear
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              setUser(parsed);
              // Try to refresh in background after a delay
              setTimeout(() => {
                refreshUser().catch(() => {
                  // If refresh still fails, keep user from localStorage
                });
              }, 2000);
            } catch (error) {
              // Invalid stored user, clear it
              localStorage.removeItem(STORAGE_KEY);
              setUser(null);
            }
          }
          setIsLoading(false);
          return;
        }
        
        // If API call fails (401 = not logged in), try loading from localStorage
        if (response.code === 'UNAUTHORIZED' || response.error === 'Unauthorized') {
          // User is not logged in - this is normal, not an error
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              // Clear stored user since session is invalid
              localStorage.removeItem(STORAGE_KEY);
              setUser(null);
            } catch (error) {
              localStorage.removeItem(STORAGE_KEY);
            }
          } else {
            setUser(null);
          }
          setIsLoading(false);
          return;
        }
        
        // Other errors (network, etc.) - try localStorage as fallback
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            // Try to verify session in background
            refreshUser().catch(() => {
              // If refresh fails, keep user from localStorage (might be temporary network issue)
              // Only clear if it's a 401 (unauthorized)
            });
          } catch (error) {
            console.error('Error loading stored user:', error);
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (error) {
        // Network or other errors - try localStorage as fallback
        const fallbackUser = localStorage.getItem(STORAGE_KEY);
        if (fallbackUser) {
          try {
            const parsed = JSON.parse(fallbackUser);
            setUser(parsed);
          } catch (e) {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);

  /**
   * Refresh current user data from API
   * @param silent If true, suppresses console errors for expected 401s (useful during login flow)
   * @param retryCount Number of retry attempts (default: 0)
   * @param maxRetries Maximum number of retries (default: 3)
   */
  const refreshUser = async (silent = false, retryCount = 0, maxRetries = 3) => {
    try {
      const response = await csrfFetch('/api/me', undefined, false, silent);
      if (response.ok && response.data) {
        const userData: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          role: response.data.user.role,
          roles: response.data.user.roles || [],
          permissions: response.data.user.permissions || [],
        };
        setUser(userData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        return;
      }
      
      // If 401 and we haven't exceeded retries, retry after a delay
      if (response.code === 'UNAUTHORIZED' && retryCount < maxRetries) {
        // Wait before retrying (exponential backoff with longer delays for cookie processing)
        // Use longer delays: 1000ms, 2000ms, 3000ms for better cookie processing time
        const delay = 1000 * (retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return refreshUser(silent, retryCount + 1, maxRetries);
      }
      
      // If not authenticated after retries, silently clear user (401 is expected for unauthenticated users)
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Retry on network errors if we haven't exceeded retries
      if (retryCount < maxRetries && error instanceof Error && error.message.includes('fetch')) {
        const delay = 500 * (retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return refreshUser(silent, retryCount + 1, maxRetries);
      }
      
      console.error('Error refreshing user:', error);
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string, rememberMe = false, twoFACode?: string) => {
    const response = await csrfFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe, code: twoFACode }),
    });

    // Check if 2FA is required (even if response is ok)
    // Note: csrfFetch returns responses with 'ok' property as-is, so requires2FA is at top level
    if (response.ok && (response.requires2FA || response.data?.requires2FA)) {
      throw new Error('Please enter your 2FA code');
    }

    if (!response.ok) {
      throw new Error(response.error || 'Login failed');
    }

    // Delay to ensure cookies are set and processed by the browser
    // Increased delay for 2FA flows to allow browser and proxy to fully process Set-Cookie headers
    // This is especially important when using a proxy (Vite dev server) and for 2FA flows
    // The delay ensures cookies are fully processed before making authenticated requests
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Refresh user data after login with retry logic
    // Use silent=true to suppress 401 console errors during login flow
    try {
      await refreshUser(true);
    } catch (error) {
      // Log error but don't throw - login was successful, just user refresh failed
      console.error('Failed to refresh user after login (this may be a cookie issue):', error);
      // Still throw to let the caller know something went wrong
      throw new Error('Login successful but failed to load user data. Please refresh the page.');
    }
  };

  /**
   * Login with Google ID token
   */
  const loginWithGoogle = async (idToken: string, rememberMe = false, twoFACode?: string) => {
    const response = await csrfFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken, rememberMe, code: twoFACode }),
    });

    // Check if 2FA is required (even if response is ok)
    if (response.ok && (response.requires2FA || response.data?.requires2FA)) {
      throw new Error('Please enter your 2FA code');
    }

    if (!response.ok) {
      throw new Error(response.error || 'Google login failed');
    }

    // Delay to ensure cookies are set and processed by the browser
    // Increased delay for 2FA flows to allow browser and proxy to fully process Set-Cookie headers
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Refresh user data after login with retry logic
    // Use silent=true to suppress 401 console errors during login flow
    try {
      await refreshUser(true);
    } catch (error) {
      // Log error but don't throw - login was successful, just user refresh failed
      console.error('Failed to refresh user after Google login (this may be a cookie issue):', error);
      // Still throw to let the caller know something went wrong
      throw new Error('Google login successful but failed to load user data. Please refresh the page.');
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await csrfFetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear user state regardless of API response
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  /**
   * Register new user
   */
  const register = async (data: RegisterData) => {
    const response = await csrfFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(response.error || 'Registration failed');
    }

    // After registration, user should login
    // Optionally auto-login here if API returns token
  };

  /**
   * List user sessions (admin/self)
   */
  const listSessions = async (userId: string): Promise<any[]> => {
    const response = await csrfFetch(`/api/admin/users/${userId}/sessions`);
    
    if (!response.ok) {
      throw new Error(response.error || 'Failed to fetch sessions');
    }

    return response.data || [];
  };

  /**
   * Revoke a session
   */
  const revokeSession = async (userId: string, sessionId: string) => {
    const response = await csrfFetch(`/api/admin/users/${userId}/revoke-session`, {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      throw new Error(response.error || 'Failed to revoke session');
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithGoogle,
    logout,
    register,
    refreshUser,
    listSessions,
    revokeSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

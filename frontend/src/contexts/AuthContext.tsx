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
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshUser: () => Promise<void>;
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

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Verify session is still valid
        refreshUser().catch(() => {
          // If refresh fails, clear stored user
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        });
      } catch (error) {
        console.error('Error loading stored user:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  /**
   * Refresh current user data from API
   */
  const refreshUser = async () => {
    try {
      const response = await csrfFetch('/api/me');
      if (response.ok && response.data) {
        const userData: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          role: response.data.user.role,
        };
        setUser(userData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        return;
      }
      // If not authenticated, clear user
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string, rememberMe = false) => {
    const response = await csrfFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });

    if (!response.ok) {
      throw new Error(response.error || 'Login failed');
    }

    // Refresh user data after login
    await refreshUser();
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

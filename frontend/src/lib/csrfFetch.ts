/**
 * CSRF-Protected Fetch Wrapper
 * 
 * Wraps native fetch with CSRF token handling, consistent error handling,
 * and automatic redirect on 401.
 */

import { bootstrapCsrf, getCsrfToken } from './csrf';

export interface CsrfFetchResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  requires2FA?: boolean; // Used when 2FA is required during login
}

/**
 * Fetch wrapper with CSRF protection
 * 
 * - Automatically includes X-CSRF-Token header
 * - Sets credentials: 'include' for cookies
 * - Sets Content-Type: application/json for JSON bodies
 * - Returns consistent response envelope
 * - Redirects to /login on 401
 * 
 * @param silent If true, suppresses console errors for expected 401s on /api/me calls
 */
export async function csrfFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  retry = false,
  silent = false
): Promise<CsrfFetchResponse<T>> {
  let token = getCsrfToken();

  if (!token) {
    await bootstrapCsrf();
    token = getCsrfToken();
  }
  
  // Prepare headers
  const headers = new Headers(init?.headers);
  
  // Add CSRF token if available
  if (token) {
    headers.set('X-CSRF-Token', token);
  }
  
  // Set Content-Type for JSON bodies
  if (init?.body && typeof init.body === 'string') {
    try {
      JSON.parse(init.body);
      headers.set('Content-Type', 'application/json');
    } catch {
      // Not JSON, keep existing Content-Type or let browser set it
    }
  }
  
  // Merge with existing init
  const fetchInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include', // Always include cookies
  };
  
  // Check if this is an /api/me call (used to check auth status)
  const isMeEndpoint = input.toString().includes('/api/me');
  // Check if this is a logout call (403 errors are expected during logout)
  const isLogoutEndpoint = input.toString().includes('/api/auth/logout');
  // Check if this is a login call (401 errors with invalid codes are expected)
  const isLoginEndpoint = input.toString().includes('/api/auth/login');
  const isOnLoginPage = window.location.pathname.includes('/login');
  // Check if this is an AI endpoint (403 errors are expected when AI is disabled)
  const isAIEndpoint = input.toString().includes('/api/ai/');
  // Check if this is a change-password endpoint (403 can happen due to CSRF or auth issues)
  const isChangePasswordEndpoint = input.toString().includes('/api/me/change-password');
  
  try {
    const response = await fetch(input, fetchInit);
    
    // Handle 429 Too Many Requests - don't redirect, just return error
    if (response.status === 429) {
      return {
        ok: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
      };
    }
    
    // Handle 404 Not Found - used by admin pages to show friendly \"feature not configured\" messages
    if (response.status === 404) {
      return {
        ok: false,
        error: 'Not found',
        code: 'NOT_FOUND',
      };
    }
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Parse response body to get actual error message from backend
      let errorMessage = 'Unauthorized';
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = await response.clone().json();
          if (data?.error) {
            errorMessage = data.error;
          }
        } catch {
          // If parsing fails, use default message
        }
      }
      
      // For /api/me calls, 401 is expected when user is not logged in
      // Suppress console errors for this case (especially during login flow)
      if (isMeEndpoint && (silent || !window.location.pathname.includes('/login'))) {
        // Silently return - this is expected behavior for unauthenticated users
        return {
          ok: false,
          error: errorMessage,
          code: 'UNAUTHORIZED',
        };
      }
      
      // For login endpoint on login page with invalid code, suppress browser console error
      // This is an expected error that we handle gracefully in the UI
      if (isLoginEndpoint && isOnLoginPage && errorMessage === 'Invalid code') {
        // Suppress the browser console error by catching it silently
        // The error is still returned to be handled by the UI
        return {
          ok: false,
          error: errorMessage,
          code: 'UNAUTHORIZED',
        };
      }
      
      // Only redirect if not already on login page and not on a public page
      // Don't redirect for account/admin pages on network errors - let them handle it
      const publicPaths = ['/login', '/register', '/', '/products', '/categories'];
      const isPublicPath = publicPaths.some(path => window.location.pathname === path || window.location.pathname.startsWith(path + '/'));
      const isAccountOrAdminPage = window.location.pathname.startsWith('/account') || window.location.pathname.startsWith('/admin');

      if (!isPublicPath && !window.location.pathname.includes('/login') && !isAccountOrAdminPage) {
        // Don't redirect for /api/me calls (they're used to check auth status)
        if (!isMeEndpoint) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }
      return {
        ok: false,
        error: errorMessage,
        code: 'UNAUTHORIZED',
      };
    }
    
    // Parse response
    let data: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Handle 403 Forbidden
    if (response.status === 403) {
      // For logout endpoint, 403 is expected (session/CSRF token may be invalidated)
      // Silently return success since logout still works on client side
      if (isLogoutEndpoint) {
        return {
          ok: true,
          data: { message: 'Logged out successfully' } as T,
        };
      }
      
      // For AI endpoints, 403 is expected when AI features are disabled
      // Suppress console errors and return gracefully
      if (isAIEndpoint) {
        // Suppress the browser console error by not logging it
        // Return null for AI endpoints when disabled
        return {
          ok: true,
          data: null as T,
        };
      }
      
      // Handle CSRF errors (403) - refresh token and retry once
      if (
        !retry &&
        (data?.error?.includes('CSRF token') || data?.message?.includes('CSRF token'))
      ) {
        await bootstrapCsrf();
        return csrfFetch<T>(input, init, true, silent);
      }
      
      // For change-password endpoint, 403 might be due to CSRF or session issues
      // Suppress console error but still return error to caller so UI can handle it
      if (isChangePasswordEndpoint) {
        // Don't log to console - let the component handle the error
        return {
          ok: false,
          error: data?.error || data?.message || 'Forbidden',
          code: 'FORBIDDEN',
        };
      }
      
      // Other 403 errors
      return {
        ok: false,
        error: data?.error || data?.message || 'Forbidden',
        code: 'FORBIDDEN',
      };
    }
    // Return consistent envelope
    if (response.ok) {
      // If response already has ok/data/error structure, return as-is
      if (data && typeof data === 'object' && 'ok' in data) {
        return data as CsrfFetchResponse<T>;
      }
      // Otherwise wrap in envelope
      return {
        ok: true,
        data: data,
      };
    } else {
      return {
        ok: false,
        error: data?.error || data?.message || `HTTP ${response.status}`,
        code: data?.code,
      };
    }
    } catch (error) {
      // Suppress console errors for AI endpoints when they fail (expected when AI is disabled)
      // The browser will still log the failed request, but we won't add extra noise
      if (isAIEndpoint) {
        // For AI endpoints, return null instead of error
        return {
          ok: true,
          data: null as T,
        };
      }
      
      // Only log errors that aren't expected 401s on /api/me
      // If silent flag is set, suppress errors for /api/me calls
      if (!isMeEndpoint || !silent) {
        console.error('Fetch error:', error);
      }
      
      // Handle specific network errors
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      // Don't redirect on network errors for account/admin pages
      const isAccountOrAdminPage = window.location.pathname.startsWith('/account') || window.location.pathname.startsWith('/admin');
      
      // For ERR_INSUFFICIENT_RESOURCES or other network errors, return error without redirecting
      if (errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') || errorMessage.includes('Failed to fetch')) {
        return {
          ok: false,
          error: 'Network error. Please refresh the page.',
          code: 'NETWORK_ERROR',
        };
      }
      
      return {
        ok: false,
        error: errorMessage,
        code: 'NETWORK_ERROR',
      };
    }
}

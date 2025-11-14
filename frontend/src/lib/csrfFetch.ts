/**
 * CSRF-Protected Fetch Wrapper
 * 
 * Wraps native fetch with CSRF token handling, consistent error handling,
 * and automatic redirect on 401.
 */

import { getCsrfToken } from './csrf';

export interface CsrfFetchResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Fetch wrapper with CSRF protection
 * 
 * - Automatically includes X-CSRF-Token header
 * - Sets credentials: 'include' for cookies
 * - Sets Content-Type: application/json for JSON bodies
 * - Returns consistent response envelope
 * - Redirects to /login on 401
 */
export async function csrfFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<CsrfFetchResponse<T>> {
  const token = getCsrfToken();
  
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
  
  try {
    const response = await fetch(input, fetchInit);
    
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
      return {
        ok: false,
        error: 'Unauthorized',
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
    console.error('Fetch error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
      code: 'NETWORK_ERROR',
    };
  }
}

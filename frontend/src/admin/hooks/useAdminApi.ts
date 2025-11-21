/**
 * Admin API Hook
 * 
 * Wrapper over csrfFetch with admin-specific convenience methods.
 */

import { useMemo } from 'react';
import { csrfFetch } from '../../lib/csrfFetch';

export interface AdminApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class AdminApiError extends Error {
  constructor(message: string, public response?: AdminApiResponse) {
    super(message);
    this.name = 'AdminApiError';
  }
}

/**
 * Admin API client with convenience methods
 */
export function useAdminApi() {
  // Memoize the API object to prevent recreation on every render
  // This prevents infinite loops in hooks that depend on useAdminApi
  return useMemo(() => {
    const get = async <T = any>(endpoint: string, params?: Record<string, any>): Promise<T> => {
      const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
      const response = await csrfFetch(`/api/admin${endpoint}${queryString}`);
      
      if (!response.ok) {
        throw new AdminApiError(response.error || 'Request failed', response);
      }
      
      const payload = (response.data ?? (response as unknown as T)) as T;
      return payload;
    };

    const post = async <T = any>(endpoint: string, body?: any): Promise<T> => {
      const response = await csrfFetch(`/api/admin${endpoint}`, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        throw new AdminApiError(response.error || 'Request failed', response);
      }
      
      const payload = (response.data ?? (response as unknown as T)) as T;
      return payload;
    };

    const put = async <T = any>(endpoint: string, body?: any): Promise<T> => {
      const response = await csrfFetch(`/api/admin${endpoint}`, {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        throw new AdminApiError(response.error || 'Request failed', response);
      }
      
      const payload = (response.data ?? (response as unknown as T)) as T;
      return payload;
    };

    const patch = async <T = any>(endpoint: string, body?: any): Promise<T> => {
      const response = await csrfFetch(`/api/admin${endpoint}`, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        throw new AdminApiError(response.error || 'Request failed', response);
      }
      
      const payload = (response.data ?? (response as unknown as T)) as T;
      return payload;
    };

    const del = async <T = any>(endpoint: string): Promise<T> => {
      const response = await csrfFetch(`/api/admin${endpoint}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new AdminApiError(response.error || 'Request failed', response);
      }
      
      const payload = (response.data ?? (response as unknown as T)) as T;
      return payload;
    };

    const postForm = async <T = any>(endpoint: string, formData: FormData): Promise<T> => {
      // Get CSRF token from meta tag
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      const response = await fetch(`/api/admin${endpoint}`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        throw new AdminApiError(data.error || 'Request failed', data);
      }
      
      return data.data as T;
    };

    return { get, post, put, patch, delete: del, postForm };
  }, []); // Empty dependency array - API methods don't depend on any props/state
}


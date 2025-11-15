/**
 * Admin API Hook
 * 
 * Wrapper over csrfFetch with admin-specific convenience methods.
 */

import { csrfFetch } from '../../lib/csrfFetch';

export interface AdminApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
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
  const get = async <T = any>(endpoint: string, params?: Record<string, any>): Promise<T> => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await csrfFetch(`/api/admin${endpoint}${queryString}`);
    
    if (!response.ok) {
      throw new AdminApiError(response.error || 'Request failed', response);
    }
    
    return response.data as T;
  };

  const post = async <T = any>(endpoint: string, body?: any): Promise<T> => {
    const response = await csrfFetch(`/api/admin${endpoint}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      throw new AdminApiError(response.error || 'Request failed', response);
    }
    
    return response.data as T;
  };

  const put = async <T = any>(endpoint: string, body?: any): Promise<T> => {
    const response = await csrfFetch(`/api/admin${endpoint}`, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      throw new AdminApiError(response.error || 'Request failed', response);
    }
    
    return response.data as T;
  };

  const del = async <T = any>(endpoint: string): Promise<T> => {
    const response = await csrfFetch(`/api/admin${endpoint}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new AdminApiError(response.error || 'Request failed', response);
    }
    
    return response.data as T;
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

  return { get, post, put, delete: del, postForm };
}


/**
 * CSRF Fetch Test
 * 
 * Tests that csrfFetch includes CSRF token in headers when meta tag is present.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { csrfFetch } from '../src/lib/csrfFetch';
import { setMetaCsrfToken } from '../src/lib/csrf';

// Mock fetch globally
global.fetch = vi.fn();

describe('csrfFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      metaTag.remove();
    }
    // Create new meta tag
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'csrf-token');
    document.head.appendChild(meta);
  });
  
  it('should include X-CSRF-Token header when meta tag is present', async () => {
    const testToken = 'test-csrf-token-123';
    setMetaCsrfToken(testToken);
    
    // Mock successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: { message: 'success' } }),
    });
    
    await csrfFetch('/api/test');
    
    // Verify fetch was called with correct headers
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRF-Token': testToken,
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
      })
    );
  });
  
  it('should use token from localStorage if meta tag is missing', async () => {
    // Remove meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      metaTag.remove();
    }
    
    const testToken = 'localstorage-token-456';
    localStorage.setItem('csrf-token', testToken);
    
    // Mock successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: { message: 'success' } }),
    });
    
    await csrfFetch('/api/test');
    
    // Verify fetch was called with token from localStorage
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRF-Token': testToken,
        }),
      })
    );
    
    localStorage.removeItem('csrf-token');
  });
  
  it('should handle 401 by returning error response', async () => {
    setMetaCsrfToken('test-token');
    
    // Mock 401 response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Unauthorized' }),
    });
    
    const response = await csrfFetch('/api/protected');
    
    expect(response.ok).toBe(false);
    expect(response.error).toBe('Authentication required');
  });
  
  it('should parse JSON response correctly', async () => {
    setMetaCsrfToken('test-token');
    
    const mockData = { id: 1, name: 'Test Product' };
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: mockData }),
    });
    
    const response = await csrfFetch<typeof mockData>('/api/product/1');
    
    expect(response.ok).toBe(true);
    expect(response.data).toEqual(mockData);
  });
});


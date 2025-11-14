/**
 * CSRF Fetch Test
 * 
 * Unit test for csrfFetch wrapper to verify CSRF token header is sent.
 */

import { csrfFetch } from '../src/lib/csrfFetch';
import { setCsrfToken } from '../src/lib/csrf';

// Mock fetch
global.fetch = jest.fn();

describe('csrfFetch', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    // Clear meta tag
    document.head.innerHTML = '';
  });

  it('should include X-CSRF-Token header when token exists', async () => {
    const token = 'test-csrf-token-123';
    setCsrfToken(token);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, data: { message: 'success' } }),
    });

    await csrfFetch('/api/test');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRF-Token': token,
        }),
        credentials: 'include',
      })
    );
  });

  it('should set Content-Type for JSON bodies', async () => {
    const token = 'test-csrf-token-123';
    setCsrfToken(token);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
    });

    await csrfFetch('/api/test', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        }),
      })
    );
  });

  it('should redirect to login on 401', async () => {
    const token = 'test-csrf-token-123';
    setCsrfToken(token);

    // Mock window.location
    delete (window as any).location;
    (window as any).location = { href: '', pathname: '/test' };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: false, error: 'Unauthorized' }),
    });

    const result = await csrfFetch('/api/test');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(window.location.href).toBe('/login?redirect=%2Ftest');
  });

  it('should return consistent response envelope', async () => {
    const token = 'test-csrf-token-123';
    setCsrfToken(token);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true, data: { id: 1 } }),
    });

    const result = await csrfFetch('/api/test');

    expect(result).toEqual({
      ok: true,
      data: { id: 1 },
    });
  });

  it('should handle network errors', async () => {
    const token = 'test-csrf-token-123';
    setCsrfToken(token);

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const result = await csrfFetch('/api/test');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network error');
    expect(result.code).toBe('NETWORK_ERROR');
  });
});


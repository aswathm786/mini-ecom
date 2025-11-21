/**
 * CSRF Token Management
 * 
 * Handles fetching and storing CSRF tokens from the server.
 * Token is stored in a meta tag for use by csrfFetch.
 */

const CSRF_META_SELECTOR = 'meta[name="csrf-token"]';

/**
 * Bootstrap CSRF token by fetching from API
 * 
 * If server-side rendering injects the token in the meta tag,
 * this function will use that. Otherwise, it fetches from /api/csrf-token.
 * 
 * Tolerant: if fetch fails, app continues but logs warning.
 */
export async function bootstrapCsrf(): Promise<void> {
  // Check if token already exists in meta tag (server-side injected)
  const existingMeta = document.querySelector(CSRF_META_SELECTOR);
  if (existingMeta && existingMeta.getAttribute('content')) {
    return;
  }

  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
    }

    const data = await response.json();
    const token = data.token || data.data?.token;

    if (!token) {
      throw new Error('CSRF token not found in response');
    }

    // Set token in meta tag
    setCsrfToken(token);
  } catch (error) {
    console.warn(
      'Failed to bootstrap CSRF token. If using server-side rendering,',
      'ensure the server injects the token in <meta name="csrf-token">.',
      'Error:',
      error
    );
    // App continues without token - server should inject it later
  }
}

/**
 * Get CSRF token from meta tag
 */
export function getCsrfToken(): string | null {
  const meta = document.querySelector(CSRF_META_SELECTOR);
  return meta?.getAttribute('content') || null;
}

/**
 * Set CSRF token in meta tag
 */
export function setCsrfToken(token: string): void {
  let meta = document.querySelector(CSRF_META_SELECTOR) as HTMLMetaElement;
  
  if (!meta) {
    // Create meta tag if it doesn't exist
    meta = document.createElement('meta');
    meta.name = 'csrf-token';
    document.head.appendChild(meta);
  }
  
  meta.setAttribute('content', token);
}

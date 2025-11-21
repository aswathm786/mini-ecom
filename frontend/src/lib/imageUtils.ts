/**
 * Image URL utilities
 * 
 * Handles image URL normalization and fallback for product images.
 */

/**
 * Normalizes image URLs to work with the API endpoint
 * Converts various URL formats to the correct API path
 */
export function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  // If it's already a full HTTP/HTTPS URL from external source, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Check if it's a localhost URL pointing to /uploads
    if (url.includes('localhost') && url.includes('/uploads/')) {
      // Extract filename and convert to API path
      const filename = url.split('/uploads/').pop();
      return `/api/uploads/${filename}`;
    }
    // Return external URLs as is
    return url;
  }

  // If it's a relative path starting with /uploads/, convert to /api/uploads/
  if (url.startsWith('/uploads/')) {
    return url.replace('/uploads/', '/api/uploads/');
  }

  // If it already starts with /api/uploads/, return as is
  if (url.startsWith('/api/uploads/')) {
    return url;
  }

  // If it's just a filename, prepend /api/uploads/
  if (!url.startsWith('/')) {
    return `/api/uploads/${url}`;
  }

  return url;
}

/**
 * Default placeholder image (SVG data URI)
 */
export const DEFAULT_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Cg transform='translate(150,150)'%3E%3Crect width='100' height='80' fill='%239ca3af' rx='4'/%3E%3Ccircle cx='35' cy='35' r='15' fill='%236b7280'/%3E%3Cpath d='M20,60 L50,35 L80,55 L80,80 L20,80 Z' fill='%236b7280'/%3E%3C/g%3E%3C/svg%3E";

/**
 * Gets image URL with fallback for missing images
 */
export function getImageUrl(url: string | undefined, fallback?: string): string {
  const normalized = normalizeImageUrl(url);
  return normalized || fallback || DEFAULT_PLACEHOLDER;
}

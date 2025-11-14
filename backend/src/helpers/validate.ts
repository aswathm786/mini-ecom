/**
 * Validation Helpers
 * 
 * Common validation functions and sanitization utilities.
 */

import { z } from 'zod';

/**
 * Sanitize string input (trim, remove extra spaces)
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Generate URL-friendly slug from string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate and sanitize slug
 */
export function validateSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Common validation schemas
 */
export const schemas = {
  productId: z.string().min(1, 'Product ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  price: z.number().positive('Price must be positive'),
  email: z.string().email('Invalid email address'),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
};


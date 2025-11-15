/**
 * HTML Sanitization Helpers
 * 
 * Provides functions to sanitize user input to prevent XSS attacks.
 */

import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize HTML content for rich text fields (allows basic formatting)
 * Use this for fields like product descriptions, email templates, etc.
 */
export function sanitizeHtmlContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      '*': ['class', 'style'],
    },
    allowedStyles: {
      '*': {
        'color': [/^#[0-9A-Fa-f]{6}$/, /^rgb\(/, /^rgba\(/],
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
        'font-size': [/^\d+(?:px|em|rem|%)$/],
        'font-weight': [/^bold$/, /^normal$/, /^\d+$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
  });
}

/**
 * Sanitize plain text fields (strips all HTML)
 * Use this for fields like product names, ticket subjects, etc.
 */
export function sanitizePlainText(text: string): string {
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

/**
 * Sanitize string input (trim and remove extra spaces)
 * This is a basic sanitization for non-HTML fields
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}


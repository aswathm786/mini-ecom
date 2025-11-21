/**
 * sanitizeForAI
 *
 * Provides utilities to clean prompts and redact sensitive data before sending
 * them to external large language models. Also sanitizes responses to prevent
 * HTML/script injection in the UI.
 */

import sanitizeHtml from 'sanitize-html';

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(\+?\d{1,3}[-.\s]?)?(?:\d[-.\s]?){7,}\b/g;
const ADDRESS_REGEX = /\d{1,5}\s+\w+(?:\s+\w+){1,4}/g;
const CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;

/**
 * Strip HTML, control characters, and sensitive details from user text input
 */
export function sanitizeAIInput(text: string, maxLength: number = 2000): string {
  if (!text) {
    return '';
  }

  let cleaned = sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(EMAIL_REGEX, '[redacted-email]');
  cleaned = cleaned.replace(PHONE_REGEX, '[redacted-phone]');
  cleaned = cleaned.replace(CARD_REGEX, '[redacted-card]');
  cleaned = cleaned.replace(ADDRESS_REGEX, '[redacted-address]');

  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '…';
  }

  return cleaned;
}

/**
 * Sanitize AI responses before returning them to clients.
 */
export function sanitizeAIOutput(text: string, maxLength: number = 4000): string {
  if (!text) {
    return '';
  }

  let cleaned = sanitizeHtml(text, {
    allowedTags: ['strong', 'em', 'ul', 'ol', 'li', 'p', 'br', 'code'],
    allowedAttributes: {},
  });

  cleaned = cleaned.replace(/\s+\n/g, '\n').trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '…';
  }

  return cleaned;
}

/**
 * Remove sensitive keys from arbitrary payloads before proxying to LLMs.
 */
export function redactSensitiveFields<T extends Record<string, any>>(payload: T, disallowedKeys: string[] = []): T {
  const forbidden = new Set(['password', 'token', 'refreshToken', 'address', 'payment', ...disallowedKeys]);
  const clone: Record<string, any> = {};

  Object.keys(payload || {}).forEach((key) => {
    if (forbidden.has(key)) {
      clone[key] = '[redacted]';
      return;
    }

    const value = payload[key];

    if (Array.isArray(value)) {
      clone[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeAIInput(item)
          : typeof item === 'object'
          ? redactSensitiveFields(item, disallowedKeys)
          : item
      );
    } else if (value && typeof value === 'object') {
      clone[key] = redactSensitiveFields(value, disallowedKeys);
    } else if (typeof value === 'string') {
      clone[key] = sanitizeAIInput(value);
    } else {
      clone[key] = value;
    }
  });

  return clone as T;
}



/**
 * Validation Utilities
 * 
 * Client-side validation helpers for forms.
 */

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Indian format)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Validate pincode (6 digits)
 */
export function validatePincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode);
}

/**
 * Validate required field
 */
export function validateRequired(value: string | undefined | null): boolean {
  return value !== undefined && value !== null && value.trim().length > 0;
}

/**
 * Validate minimum length
 */
export function validateMinLength(value: string, min: number): boolean {
  return value.length >= min;
}

/**
 * Validate maximum length
 */
export function validateMaxLength(value: string, max: number): boolean {
  return value.length <= max;
}

/**
 * Get validation error message
 */
export function getValidationError(field: string, value: any, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    if (!rule.validator(value)) {
      return rule.message || `${field} is invalid`;
    }
  }
  return null;
}

export interface ValidationRule {
  validator: (value: any) => boolean;
  message?: string;
}

/**
 * Common validation rules
 */
export const rules = {
  required: (message?: string): ValidationRule => ({
    validator: (value) => validateRequired(value),
    message: message || 'This field is required',
  }),
  email: (message?: string): ValidationRule => ({
    validator: (value) => !value || validateEmail(value),
    message: message || 'Invalid email address',
  }),
  phone: (message?: string): ValidationRule => ({
    validator: (value) => !value || validatePhone(value),
    message: message || 'Invalid phone number',
  }),
  pincode: (message?: string): ValidationRule => ({
    validator: (value) => !value || validatePincode(value),
    message: message || 'Pincode must be 6 digits',
  }),
  minLength: (min: number, message?: string): ValidationRule => ({
    validator: (value) => !value || validateMinLength(value, min),
    message: message || `Minimum length is ${min} characters`,
  }),
  maxLength: (max: number, message?: string): ValidationRule => ({
    validator: (value) => !value || validateMaxLength(value, max),
    message: message || `Maximum length is ${max} characters`,
  }),
};


/**
 * Password Validator Utility
 * 
 * Validates passwords against configured password policy settings.
 */

import { Config } from '../config/Config';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate password against configured policy
 * 
 * @param password - The password to validate
 * @returns Validation result with errors if any
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  // Check if password policy is enabled
  const policyEnabled = Config.bool('auth.password.policy.enabled', false);
  
  if (!policyEnabled) {
    // If policy is disabled, only check minimum length (default 8)
    const minLength = Config.int('auth.password.policy.minLength', 8);
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters`);
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  // Policy is enabled, check all configured rules
  const minLength = Config.int('auth.password.policy.minLength', 8);
  const requireUppercase = Config.bool('auth.password.policy.requireUppercase', false);
  const requireLowercase = Config.bool('auth.password.policy.requireLowercase', false);
  const requireNumber = Config.bool('auth.password.policy.requireNumber', false);
  const requireSpecial = Config.bool('auth.password.policy.requireSpecial', false);
  
  // Check minimum length
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }
  
  // Check for uppercase letter
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letter
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for number
  if (requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for special character
  if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get password policy requirements as a human-readable string
 * Useful for displaying requirements to users
 */
export function getPasswordPolicyRequirements(): string[] {
  const policyEnabled = Config.bool('auth.password.policy.enabled', false);
  const requirements: string[] = [];
  
  if (!policyEnabled) {
    const minLength = Config.int('auth.password.policy.minLength', 8);
    requirements.push(`At least ${minLength} characters`);
    return requirements;
  }
  
  const minLength = Config.int('auth.password.policy.minLength', 8);
  requirements.push(`At least ${minLength} characters`);
  
  if (Config.bool('auth.password.policy.requireUppercase', false)) {
    requirements.push('One uppercase letter');
  }
  
  if (Config.bool('auth.password.policy.requireLowercase', false)) {
    requirements.push('One lowercase letter');
  }
  
  if (Config.bool('auth.password.policy.requireNumber', false)) {
    requirements.push('One number');
  }
  
  if (Config.bool('auth.password.policy.requireSpecial', false)) {
    requirements.push('One special character');
  }
  
  return requirements;
}


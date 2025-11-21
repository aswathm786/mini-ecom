/**
 * Server Time Utility
 * 
 * Provides utilities for working with server time to ensure all time-based
 * operations use the server's clock, not client time.
 */

/**
 * Get the current server time as a Date object
 * This ensures all time checks use the server's clock
 */
export function getServerTime(): Date {
  return new Date();
}

/**
 * Check if a date has expired (is in the past)
 * @param expiryDate The date to check
 * @returns true if the date has expired, false otherwise
 */
export function isExpired(expiryDate: Date | undefined | null): boolean {
  if (!expiryDate) {
    return true;
  }
  return expiryDate <= getServerTime();
}

/**
 * Check if a date is still valid (is in the future)
 * @param expiryDate The date to check
 * @returns true if the date is still valid, false otherwise
 */
export function isValid(expiryDate: Date | undefined | null): boolean {
  return !isExpired(expiryDate);
}


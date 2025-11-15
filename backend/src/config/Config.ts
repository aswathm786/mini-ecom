/**
 * Configuration loader for Handmade Harmony
 * 
 * Supports two-tier configuration:
 * 1. Environment variables (.env file)
 * 2. Database settings (settings collection) - overrides .env at runtime
 * 
 * Database settings take precedence over .env values.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Runtime settings cache (populated from DB)
let runtimeSettings: Map<string, any> = new Map();

/**
 * Initialize runtime settings from database
 * This should be called at server startup after MongoDB connection
 */
export function setRuntimeSettings(settings: Map<string, any>): void {
  runtimeSettings = settings;
}

/**
 * Get a configuration value
 * Priority: runtime settings (DB) > environment variable > default value
 */
export function get(key: string, defaultValue?: any): any {
  // Check runtime settings first (DB overrides)
  if (runtimeSettings.has(key)) {
    return runtimeSettings.get(key);
  }
  
  // Fall back to environment variable
  const envValue = process.env[key];
  if (envValue !== undefined) {
    return envValue;
  }
  
  // Return default if provided
  return defaultValue;
}

/**
 * Get a required configuration value (throws if missing)
 */
export function require(key: string): any {
  const value = get(key);
  if (value === undefined || value === null) {
    throw new Error(`Required configuration key "${key}" is missing`);
  }
  return value;
}

/**
 * Get a boolean configuration value
 */
export function bool(key: string, defaultValue: boolean = false): boolean {
  const value = get(key, defaultValue);
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
}

/**
 * Get an integer configuration value
 */
export function int(key: string, defaultValue?: number): number {
  const value = get(key, defaultValue);
  if (typeof value === 'number') {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Configuration key "${key}" must be a valid integer`);
}

/**
 * Get all configuration values (for debugging)
 */
export function getAll(): Record<string, any> {
  const env: Record<string, any> = {};
  for (const key in process.env) {
    if (process.env.hasOwnProperty(key)) {
      env[key] = process.env[key];
    }
  }
  
  // Override with runtime settings
  runtimeSettings.forEach((value, key) => {
    env[key] = value;
  });
  
  return env;
}

// Export commonly used config values as constants
export const Config = {
  // Application
  NODE_ENV: get('NODE_ENV', 'development'),
  APP_NAME: get('APP_NAME', 'Handmade Harmony'),
  APP_URL: get('APP_URL', 'http://localhost:80'),
  API_URL: get('API_URL', 'http://localhost:3000'),
  PORT: int('PORT', 3000),
  
  // Database
  MONGODB_URI: get('MONGO_URI') || require('MONGO_URI'),
  
  // Security
  JWT_SECRET: require('JWT_SECRET'),
  JWT_EXPIRES_IN: get('JWT_EXPIRES_IN', '7d'),
  CSRF_SECRET: require('CSRF_SECRET'),
  SESSION_SECRET: require('SESSION_SECRET'),
  COOKIE_SECURE: bool('COOKIE_SECURE', false),
  COOKIE_SAME_SITE: get('COOKIE_SAME_SITE', 'Lax') as 'strict' | 'lax' | 'none',
  REMEMBER_ME_EXPIRES_IN: get('REMEMBER_ME_EXPIRES_IN', '30d'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: int('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: int('RATE_LIMIT_MAX_REQUESTS', 100),
  AUTH_RATE_LIMIT_WINDOW_MS: int('AUTH_RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
  AUTH_RATE_LIMIT_MAX_REQUESTS: int('AUTH_RATE_LIMIT_MAX_REQUESTS', 5),
  
  // CORS
  CORS_ORIGIN: get('CORS_ORIGIN', 'http://localhost:3000'),
  CORS_CREDENTIALS: bool('CORS_CREDENTIALS', true),
  
  // Logging
  LOG_LEVEL: get('LOG_LEVEL', 'info'),
  LOG_DIR: get('LOG_DIR', './logs'),
};


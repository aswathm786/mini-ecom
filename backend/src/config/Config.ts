/**
 * Configuration loader for Handmade Harmony
 * 
 * Supports two-tier configuration:
 * 1. Environment variables (.env file)
 * 2. Database settings (settings collection) - overrides .env at runtime
 * 
 * Database settings take precedence over .env values.
 * 
 * Some settings are "database-only" - they are ONLY read from the database,
 * never from .env files. These are admin-configurable settings that can be
 * changed via the admin panel:
 * - AI Provider API keys (GEMINI_API_KEY, OPENAI_API_KEY, etc.)
 * - Payment gateway keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
 * - Shipping provider keys (DELHIVERY_TOKEN, DELHIVERY_CLIENT_ID)
 * - OAuth secrets (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
 * - SMTP settings (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, etc.)
 * - Password policy settings (auth.password.policy.*)
 * 
 * These should be configured via the admin panel, not .env files.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Runtime settings cache (populated from DB)
let runtimeSettings: Map<string, any> = new Map();

/**
 * Configuration keys that should ONLY be read from the database, never from .env
 * These are admin-configurable settings that can be changed via the admin panel.
 */
const DB_ONLY_KEYS = [
  // AI Provider API keys
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'OPENROUTER_API_KEY',
  'LOCAL_LLM_URL',
  'LOCAL_LLM_API_KEY',
  // Razorpay
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  // Delhivery
  'DELHIVERY_TOKEN',
  'DELHIVERY_CLIENT_ID',
  // Google OAuth
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  // SMTP settings
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL',
  'SMTP_FROM_NAME',
  // Password policy settings
  'auth.password.policy.enabled',
  'auth.password.policy.minLength',
  'auth.password.policy.requireUppercase',
  'auth.password.policy.requireLowercase',
  'auth.password.policy.requireNumber',
  'auth.password.policy.requireSpecial',
] as const;

/**
 * Initialize runtime settings from database
 * This should be called at server startup after MongoDB connection
 */
export function setRuntimeSettings(settings: Map<string, any>): void {
  runtimeSettings = settings;
}

/**
 * Get a configuration value
 * 
 * Priority for most keys: runtime settings (DB) > environment variable > default value
 * 
 * For database-only keys (admin-configurable settings), only checks:
 * runtime settings (DB) > default value (skips .env fallback)
 */
export function get(key: string, defaultValue?: any): any {
  const isDbOnly = DB_ONLY_KEYS.includes(key as any);
  
  // Check runtime settings first (DB)
  if (runtimeSettings.has(key)) {
    return runtimeSettings.get(key);
  }
  
  // For DB-only keys, skip .env and return default if provided
  if (isDbOnly) {
    return defaultValue;
  }
  
  // For other keys, fall back to environment variable
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
export function requireConfig(key: string): any {
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
  // Helper methods
  get,
  bool,
  int,

  // Application
  NODE_ENV: get('NODE_ENV', 'development'),
  APP_NAME: get('APP_NAME', 'Handmade Harmony'),
  APP_URL: get('APP_URL', 'http://localhost:80'),
  API_URL: get('API_URL', 'http://localhost:3001'),
  PORT: int('PORT', 3001),

  // Database
  MONGODB_URI: get('MONGODB_URI') || get('MONGO_URI') || 'mongodb://localhost:27017/ecommerce',

  // Security
  JWT_SECRET: requireConfig('JWT_SECRET'),
  JWT_EXPIRES_IN: get('JWT_EXPIRES_IN', '7d'),
  CSRF_SECRET: requireConfig('CSRF_SECRET'),
  SESSION_SECRET: requireConfig('SESSION_SECRET'),
  COOKIE_SECURE: bool('COOKIE_SECURE', false),
  COOKIE_SAME_SITE: get('COOKIE_SAME_SITE', 'Lax') as 'strict' | 'lax' | 'none',
  REMEMBER_ME_EXPIRES_IN: get('REMEMBER_ME_EXPIRES_IN', '30d'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: int('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: int('RATE_LIMIT_MAX_REQUESTS', 100),
  AUTH_RATE_LIMIT_WINDOW_MS: int('AUTH_RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
  AUTH_RATE_LIMIT_MAX_REQUESTS: int('AUTH_RATE_LIMIT_MAX_REQUESTS', 5),
  AI_CHAT_RATE_LIMIT_WINDOW_MS: int('AI_CHAT_RATE_LIMIT_WINDOW_MS', 60000),
  AI_CHAT_RATE_LIMIT_MAX_REQUESTS: int('AI_CHAT_RATE_LIMIT_MAX_REQUESTS', 20),
  AI_SEARCH_RATE_LIMIT_WINDOW_MS: int('AI_SEARCH_RATE_LIMIT_WINDOW_MS', 60000),
  AI_SEARCH_RATE_LIMIT_MAX_REQUESTS: int('AI_SEARCH_RATE_LIMIT_MAX_REQUESTS', 30),
  AI_ADMIN_RATE_LIMIT_WINDOW_MS: int('AI_ADMIN_RATE_LIMIT_WINDOW_MS', 3600000),
  AI_ADMIN_RATE_LIMIT_MAX_REQUESTS: int('AI_ADMIN_RATE_LIMIT_MAX_REQUESTS', 200),

  // CORS
  CORS_ORIGIN: get('CORS_ORIGIN', 'http://localhost:5173'),
  CORS_CREDENTIALS: bool('CORS_CREDENTIALS', true),

  // Logging
  LOG_LEVEL: get('LOG_LEVEL', 'info'),
  LOG_DIR: get('LOG_DIR', './logs'),

  // AI Providers - Use Config.get() directly in services (loaded from DB)
  // Removed constants to force services to use Config.get() which checks DB first
  OPENROUTER_MODEL: get('OPENROUTER_MODEL', 'openrouter/auto'),
  AI_DEFAULT_PROVIDER: get('AI_DEFAULT_PROVIDER', 'gemini') as 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'local',
  AI_STREAMING_ENABLED: bool('AI_STREAMING_ENABLED', true),
  AI_CACHE_TTL_SECONDS: int('AI_CACHE_TTL_SECONDS', 300),

  // OAuth / Social Login - Use Config.get() directly in services (loaded from DB)
  // Removed constants to force services to use Config.get() which checks DB first
  GOOGLE_OAUTH_REDIRECT_URI: get('GOOGLE_OAUTH_REDIRECT_URI', ''),
};


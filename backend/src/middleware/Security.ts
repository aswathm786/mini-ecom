/**
 * Security Middleware
 * 
 * Configures Helmet, CORS, and rate limiting for Express app.
 */

import { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Config } from '../config/Config';

/**
 * Configure Helmet with Content Security Policy
 */
export function setupHelmet(app: Express): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Tailwind CSS
            'https://cdn.tailwindcss.com', // Tailwind CDN (if used)
          ],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Vite HMR in development
            'https://accounts.google.com', // Google OAuth
          ],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'https:', 'data:'],
          connectSrc: ["'self'", Config.API_URL, 'https://accounts.google.com'], // Google OAuth
          frameSrc: ["'self'", 'https://accounts.google.com'], // Google OAuth
          objectSrc: ["'none'"],
          upgradeInsecureRequests: Config.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding if needed
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Allow Google OAuth popup communication
      hsts: {
        maxAge: Config.NODE_ENV === 'production' ? 31536000 : 0, // 1 year in production
        includeSubDomains: true,
        preload: true,
      },
    })
  );
}

/**
 * Configure CORS
 */
export function setupCors(app: Express): void {
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      const allowedOrigins = Config.CORS_ORIGIN.split(',').map(o => o.trim());
      
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // In development, allow localhost on any port
      if (Config.NODE_ENV === 'development') {
        if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
          return callback(null, true);
        }
      }
      
      // Check if origin is allowed
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: Config.CORS_CREDENTIALS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
  };

  app.use(cors(corsOptions));
}

/**
 * Lenient rate limiter for public/common endpoints
 * Used for frequently-called endpoints like /api/csrf-token, /api/me, /api/theme-settings
 */
export const publicRateLimiter = rateLimit({
  windowMs: Config.NODE_ENV === 'development' ? 60000 : 60000, // 1 minute
  max: Config.NODE_ENV === 'development' ? 1000 : 200, // Very lenient in dev, reasonable in prod
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * General rate limiter for most routes
 */
export const generalRateLimiter = rateLimit({
  windowMs: Config.RATE_LIMIT_WINDOW_MS,
  max: Config.NODE_ENV === 'development' ? 1000 : Config.RATE_LIMIT_MAX_REQUESTS, // More lenient in dev
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: Config.AUTH_RATE_LIMIT_WINDOW_MS,
  max: Config.AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});


/**
 * CSRF Protection Middleware
 * 
 * Implements CSRF token generation and verification.
 * Uses session-backed tokens stored in-memory (placeholder for future DB-backed sessions).
 * 
 * For SPA compatibility:
 * - GET /api/csrf-token returns a token
 * - Token is stored in HttpOnly cookie and also returned in response
 * - All state-changing requests must include token in X-CSRF-Token header
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { Config } from '../config/Config';

// In-memory token storage (placeholder - will move to DB sessions collection later)
// Map<sessionId, token>
const csrfTokens = new Map<string, string>();

/**
 * Generate a random CSRF token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get or create a session ID from request
 * Uses a combination of IP and User-Agent hash as session identifier
 * (Placeholder - will use actual session ID from sessions collection later)
 */
function getSessionId(req: Request): string {
  // For now, use a hash of IP + User-Agent as session identifier
  // This is a placeholder until we implement proper session management
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const ua = req.get('user-agent') || 'unknown';
  const sessionKey = `${ip}:${ua}`;
  return crypto.createHash('sha256').update(sessionKey).digest('hex');
}

/**
 * CSRF token generation endpoint middleware
 * Returns token in both cookie and JSON response
 */
export function csrfTokenHandler(req: Request, res: Response): void {
  const sessionId = getSessionId(req);
  
  // Generate new token
  const token = generateToken();
  
  // Store token (in-memory placeholder)
  csrfTokens.set(sessionId, token);
  
  // Set token in HttpOnly cookie
  res.cookie('csrf-token', token, {
    httpOnly: true,
    secure: Config.COOKIE_SECURE,
    sameSite: Config.COOKIE_SAME_SITE,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
  
  // Return token in response (for SPA to read and put in meta tag)
  res.json({ token });
}

/**
 * CSRF verification middleware
 * Verifies X-CSRF-Token header matches the token stored for this session
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const sessionId = getSessionId(req);
  const storedToken = csrfTokens.get(sessionId);
  const providedToken = req.headers['x-csrf-token'] as string;
  
  // Check if token exists for this session
  if (!storedToken) {
    return res.status(403).json({
      error: 'CSRF token not found. Please request a new token from /api/csrf-token',
    });
  }
  
  // Verify token matches
  if (!providedToken || providedToken !== storedToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
    });
  }
  
  // Token is valid, continue
  next();
}

/**
 * Clear CSRF token for a session (e.g., on logout)
 */
export function clearCsrfToken(sessionId: string): void {
  csrfTokens.delete(sessionId);
}


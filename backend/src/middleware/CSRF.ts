/**
 * CSRF Protection Middleware
 * 
 * Implements CSRF token generation and verification.
 * Uses MongoDB sessions collection to store CSRF tokens.
 * 
 * For SPA compatibility:
 * - GET /api/csrf-token returns a token
 * - Token is stored in HttpOnly cookie and also returned in response
 * - All state-changing requests must include token in X-CSRF-Token header
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { Config } from '../config/Config';
import { mongo } from '../db/Mongo';
import { Session } from '../types';

/**
 * Generate a random CSRF token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get session ID from request
 * Uses the sessionId from the authenticated session (if available) or creates a temporary one
 */
function getSessionId(req: Request): string | null {
  // If user is authenticated, use their session ID
  if (req.sessionId) {
    return req.sessionId;
  }
  
  // For unauthenticated requests, we can't reliably track sessions
  // This should only be used for public endpoints that don't require auth
  // For authenticated endpoints, req.sessionId should always be available
  return null;
}

/**
 * CSRF token generation endpoint middleware
 * Returns token in both cookie and JSON response
 */
export async function csrfTokenHandler(req: Request, res: Response): Promise<void> {
  const sessionId = getSessionId(req);
  
  if (!sessionId) {
    // For unauthenticated requests, we can still generate a token but it won't be persisted
    // This is acceptable for public endpoints
    const token = generateToken();
    res.cookie('csrf-token', token, {
      httpOnly: true,
      secure: Config.COOKIE_SECURE,
      sameSite: Config.COOKIE_SAME_SITE,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    res.json({ token });
    return;
  }
  
  // Generate new token
  const token = generateToken();
  
  // Store token in session document
  const db = mongo.getDb();
  const sessionsCollection = db.collection<Session>('sessions');
  
  await sessionsCollection.updateOne(
    { token: sessionId },
    { $set: { csrfToken: token } }
  );
  
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
export async function csrfProtection(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const sessionId = getSessionId(req);
  const providedToken = req.headers['x-csrf-token'] as string;
  
  if (!sessionId) {
    // For unauthenticated requests, we can't verify CSRF tokens reliably
    // This should only happen for public endpoints
    // For authenticated endpoints, sessionId should always be available
    return res.status(403).json({
      error: 'CSRF token verification requires authentication',
    });
  }
  
  // Get stored token from session document
  const db = mongo.getDb();
  const sessionsCollection = db.collection<Session & { csrfToken?: string }>('sessions');
  
  const session = await sessionsCollection.findOne({ token: sessionId });
  
  if (!session || !session.csrfToken) {
    return res.status(403).json({
      error: 'CSRF token not found. Please request a new token from /api/csrf-token',
    });
  }
  
  // Verify token matches
  if (!providedToken || providedToken !== session.csrfToken) {
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
export async function clearCsrfToken(sessionId: string): Promise<void> {
  const db = mongo.getDb();
  const sessionsCollection = db.collection<Session & { csrfToken?: string }>('sessions');
  await sessionsCollection.updateOne(
    { token: sessionId },
    { $unset: { csrfToken: '' } }
  );
}


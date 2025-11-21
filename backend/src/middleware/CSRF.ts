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
import { Session, JWTPayload } from '../types';
import * as jwt from 'jsonwebtoken';

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

  // Try to derive session ID from JWT cookie (for authenticated fetches before requireAuth runs)
  const cookieToken = req.cookies?.sessionToken;
  if (cookieToken) {
    try {
      const payload = jwt.verify(cookieToken, Config.JWT_SECRET) as JWTPayload;
      return payload.sessionId;
    } catch (error) {
      console.warn('CSRF middleware: failed to decode sessionToken cookie', error);
    }
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
  try {
    const sessionId = getSessionId(req);
    
    // Generate token (always generate, even if we can't store it)
    const token = generateToken();
    
    // Try to store token in session if sessionId exists and MongoDB is available
    if (sessionId) {
      try {
        const db = mongo.getDb();
        const sessionsCollection = db.collection<Session>('sessions');
        
        await sessionsCollection.updateOne(
          { token: sessionId },
          { $set: { csrfToken: token } }
        );
      } catch (error) {
        // If MongoDB isn't available, log warning but continue
        // Token will still be returned in cookie and response
        console.warn('Could not store CSRF token in session (MongoDB unavailable):', error);
      }
    }
    
    // Set token in HttpOnly cookie (always set, even if storage failed)
    res.cookie('csrf-token', token, {
      httpOnly: true,
      secure: Config.COOKIE_SECURE,
      sameSite: Config.COOKIE_SAME_SITE,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Return token in response (for SPA to read and put in meta tag)
    res.json({ token });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    // Even on error, try to return a token so the app can continue
    const fallbackToken = generateToken();
    res.cookie('csrf-token', fallbackToken, {
      httpOnly: true,
      secure: Config.COOKIE_SECURE,
      sameSite: Config.COOKIE_SAME_SITE,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.json({ token: fallbackToken });
  }
}

/**
 * CSRF verification middleware
 * Verifies X-CSRF-Token header matches the token stored in session or cookie
 * 
 * For authenticated users: checks token in session document
 * For unauthenticated users: checks token in cookie (for public endpoints like register/login)
 * 
 * For login endpoints: More lenient - allows request to proceed even if CSRF fails,
 * so that blocked user errors can be shown instead of CSRF errors
 */
export async function csrfProtection(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const isLoginEndpoint = req.path === '/auth/login' || req.path.endsWith('/auth/login');
  const isGoogleLoginEndpoint = req.path === '/auth/google' || req.path.endsWith('/auth/google');
  const isAuthEndpoint = isLoginEndpoint || isGoogleLoginEndpoint;
  const sessionId = getSessionId(req);
  const providedToken = req.headers['x-csrf-token'] as string;
  
  if (!providedToken) {
    console.warn('CSRF protection: Missing X-CSRF-Token header', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    
    // For login endpoints, allow request to proceed so blocked user check can happen
    if (isAuthEndpoint) {
      console.warn('CSRF protection: Allowing auth request without token to check user status');
      return next();
    }
    
    res.status(403).json({
      ok: false,
      error: 'CSRF token is required. Please include X-CSRF-Token header.',
    });
    return;
  }
  
  // For authenticated users, verify against session
  if (sessionId) {
    try {
      const db = mongo.getDb();
      const sessionsCollection = db.collection<Session & { csrfToken?: string }>('sessions');
      
      const session = await sessionsCollection.findOne({ token: sessionId });
      
      if (!session || !session.csrfToken) {
        // For auth endpoints, allow request to proceed
        if (isAuthEndpoint) {
          console.warn('CSRF protection: Allowing auth request without session token to check user status');
          return next();
        }
        
        res.status(403).json({
          ok: false,
          error: 'CSRF token not found. Please request a new token from /api/csrf-token',
        });
        return;
      }
      
      // Verify token matches
      if (providedToken !== session.csrfToken) {
        console.warn('CSRF protection: Token mismatch for authenticated user', {
          userId: session.userId,
          path: req.path,
          ip: req.ip,
        });
        
        // For auth endpoints, allow request to proceed
        if (isAuthEndpoint) {
          console.warn('CSRF protection: Allowing auth request with mismatched token to check user status');
          return next();
        }
        
        res.status(403).json({
          ok: false,
          error: 'Invalid CSRF token',
        });
        return;
      }
      
      // Token is valid, continue
      return next();
    } catch (error) {
      console.error('Error verifying CSRF token from session:', error);
      // Fall through to cookie-based verification
    }
  }
  
  // For unauthenticated users (public endpoints), verify against cookie
  const cookieToken = req.cookies?.['csrf-token'];
  
  if (!cookieToken) {
    // For auth endpoints, allow request to proceed so blocked user check can happen
    if (isAuthEndpoint) {
      console.warn('CSRF protection: Allowing auth request without cookie token to check user status');
      return next();
    }
    
    res.status(403).json({
      ok: false,
      error: 'CSRF token not found. Please request a new token from /api/csrf-token',
    });
    return;
  }
  
  // Verify token from cookie matches provided token
  if (providedToken !== cookieToken) {
    console.warn('CSRF protection: Token mismatch for unauthenticated user', {
      path: req.path,
      ip: req.ip,
    });
    
    // For auth endpoints, allow request to proceed so blocked user check can happen
    if (isAuthEndpoint) {
      console.warn('CSRF protection: Allowing auth request with mismatched cookie token to check user status');
      return next();
    }
    
    res.status(403).json({
      ok: false,
      error: 'Invalid CSRF token. Please request a new token from /api/csrf-token',
    });
    return;
  }
  
  // Log successful CSRF verification for unauthenticated requests (for debugging)
  if (Config.NODE_ENV === 'development') {
    console.log('CSRF protection: Token verified for unauthenticated request', {
      path: req.path,
      method: req.method,
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


/**
 * Authentication Middleware
 * 
 * Verifies JWT session tokens and attaches user info to request.
 * Uses MongoDB sessions collection for persistent session storage.
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { Config } from '../config/Config';
import { JWTPayload, Session, AuditLog } from '../types';
import { mongo } from '../db/Mongo';

/**
 * Generate browser fingerprint from request
 * Combines: user-agent, IP, accept-language, accept-encoding
 */
function generateFingerprint(req: Request): string {
  const userAgent = req.get('user-agent') || '';
  const ip = req.ip || req.socket.remoteAddress || '';
  const acceptLanguage = req.get('accept-language') || '';
  const acceptEncoding = req.get('accept-encoding') || '';
  
  // Combine all fingerprint components
  const fingerprintString = `${userAgent}|${ip}|${acceptLanguage}|${acceptEncoding}`;
  
  // Generate SHA-256 hash
  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}

/**
 * Validate fingerprint against stored session
 * Returns true if valid, false if mismatch
 */
async function validateFingerprint(
  session: Session,
  currentFingerprint: string,
  req: Request
): Promise<boolean> {
  // If session has no fingerprint (old sessions), skip validation
  if (!session.fingerprint) {
    return true;
  }
  
  // Compare fingerprints
  if (session.fingerprint === currentFingerprint) {
    return true;
  }
  
  // Fingerprint mismatch - log for security monitoring
  const db = mongo.getDb();
  const auditCollection = db.collection<AuditLog>('audit_logs');
  
  await auditCollection.insertOne({
    actorId: session.userId,
    actorType: 'user',
    action: 'auth.fingerprint.mismatch',
    objectType: 'session',
    objectId: session.token,
    metadata: {
      storedFingerprint: session.fingerprint.substring(0, 16) + '...',
      currentFingerprint: currentFingerprint.substring(0, 16) + '...',
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    },
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    createdAt: new Date(),
  });
  
  // Check if we should invalidate session on mismatch
  // For now, we log but don't invalidate (configurable behavior)
  const invalidateOnMismatch = Config.get('SESSION_INVALIDATE_ON_FINGERPRINT_MISMATCH', false);
  
  if (invalidateOnMismatch) {
    const sessionsCollection = db.collection<Session>('sessions');
    await sessionsCollection.deleteOne({ token: session.token });
    return false;
  }
  
  // Log warning but allow access (monitoring mode)
  console.warn(`Fingerprint mismatch for session ${session.token.substring(0, 8)}...`);
  return true;
}

/**
 * Require authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Get token from Authorization header or cookie
    let token: string | undefined;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.sessionToken) {
      token = req.cookies.sessionToken;
    }
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Verify JWT token
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, Config.JWT_SECRET) as JWTPayload;
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    
    // Check if session exists in database
    const db = mongo.getDb();
    const sessionsCollection = db.collection<Session>('sessions');
    
    const session = await sessionsCollection.findOne({ 
      token: payload.sessionId,
      userId: payload.userId 
    });
    
    if (!session) {
      res.status(401).json({ error: 'Session not found' });
      return;
    }
    
    // Check if session expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await sessionsCollection.deleteOne({ token: payload.sessionId });
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    
    // Validate fingerprint to prevent session hijacking
    // In development, be more lenient with fingerprint validation
    if (Config.NODE_ENV === 'production') {
      const currentFingerprint = generateFingerprint(req);
      const fingerprintValid = await validateFingerprint(session, currentFingerprint, req);
      
      if (!fingerprintValid) {
        res.status(401).json({ error: 'Session security validation failed' });
        return;
      }
    }
    // In development, skip strict fingerprint validation for easier testing
    
    // Load user from database
    let user;
    try {
      // Convert string userId to ObjectId for MongoDB query
      const userId = new ObjectId(payload.userId);
      user = await db.collection('users').findOne({ _id: userId });
    } catch (error) {
      // Invalid ObjectId format
      res.status(401).json({ error: 'Invalid user ID' });
      return;
    }
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    // Attach user info to request
    req.userId = payload.userId;
    req.sessionId = session.token; // Use the token from database session
    req.user = user as any;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Optional authentication middleware
 * Tries to extract user info from JWT token if present, but doesn't block if not
 * Also handles anonymous session IDs for cart tracking
 * Sets req.userId and req.sessionId appropriately
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Try to get token from Authorization header or cookie
    let token: string | undefined;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.sessionToken) {
      token = req.cookies.sessionToken;
    }
    
    // If token exists, try to verify it and extract user info
    if (token) {
      try {
        const payload = jwt.verify(token, Config.JWT_SECRET) as JWTPayload;
        
        // Check if session exists in database
        const db = mongo.getDb();
        const sessionsCollection = db.collection<Session>('sessions');
        
        const session = await sessionsCollection.findOne({ 
          token: payload.sessionId,
          userId: payload.userId 
        });
        
        // If session exists and is valid, set user info
        if (session && session.expiresAt >= new Date()) {
          req.userId = payload.userId;
          req.sessionId = session.token;
          
          // Load user from database
          try {
            const userId = new ObjectId(payload.userId);
            const user = await db.collection('users').findOne({ _id: userId });
            if (user) {
              req.user = user as any;
            }
          } catch (error) {
            // Invalid ObjectId, continue without user
          }
        }
      } catch (error) {
        // Token invalid or expired, continue as anonymous user
      }
    }
    
    // For anonymous users, generate or retrieve a session ID from cookie
    if (!req.sessionId) {
      let anonymousSessionId = req.cookies?.anonymousSessionId;
      
      // If no anonymous session ID exists, generate one
      if (!anonymousSessionId) {
        anonymousSessionId = crypto.randomBytes(32).toString('hex');
        // Set cookie for anonymous session (expires in 30 days)
        res.cookie('anonymousSessionId', anonymousSessionId, {
          httpOnly: true,
          secure: Config.COOKIE_SECURE,
          sameSite: Config.COOKIE_SAME_SITE,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
      }
      
      req.sessionId = anonymousSessionId;
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // On error, still try to set anonymous session ID
    if (!req.sessionId) {
      let anonymousSessionId = req.cookies?.anonymousSessionId;
      if (!anonymousSessionId) {
        anonymousSessionId = crypto.randomBytes(32).toString('hex');
        res.cookie('anonymousSessionId', anonymousSessionId, {
          httpOnly: true,
          secure: Config.COOKIE_SECURE,
          sameSite: Config.COOKIE_SAME_SITE,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
      }
      req.sessionId = anonymousSessionId;
    }
    next();
  }
}

/**
 * Require admin role middleware
 * Must be used after requireAuth
 * 
 * @deprecated Use requireAdmin from RequireRole.ts instead for full RBAC support
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  // Check if user has admin or root role
  const userRole = (req.user as any).role;
  if (userRole !== 'admin' && userRole !== 'root') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
}

/**
 * Create a new session and return JWT token
 * (Called from login controller)
 */
export async function createSession(
  userId: string, 
  email: string, 
  expiresIn: string | number = Config.JWT_EXPIRES_IN,
  req?: Request
): Promise<{ token: string; sessionId: string; refreshToken: string }> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(32).toString('hex');
  
  // Calculate expiration
  const expiresAt = new Date();
  const expiresInStr = typeof expiresIn === 'string' ? expiresIn : String(expiresIn);
  const expiresInMs = parseExpiresIn(expiresInStr);
  expiresAt.setTime(expiresAt.getTime() + expiresInMs);
  
  // Refresh token expires in 30 days (longer than access token)
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setTime(refreshExpiresAt.getTime() + (30 * 24 * 60 * 60 * 1000));
  
  // Store session in database
  const db = mongo.getDb();
  const sessionsCollection = db.collection<Session>('sessions');
  
  // Generate fingerprint for session hijacking prevention
  const fingerprint = req ? generateFingerprint(req) : undefined;
  
  const session: Session = {
    userId,
    token: sessionId,
    refreshToken,
    deviceId: req?.get('user-agent') ? crypto.createHash('sha256').update(req.get('user-agent') || '').digest('hex').substring(0, 16) : undefined,
    ipAddress: req?.ip || req?.socket.remoteAddress,
    userAgent: req?.get('user-agent'),
    fingerprint,
    createdAt: new Date(),
    expiresAt,
    refreshExpiresAt,
  };
  
  await sessionsCollection.insertOne(session);
  
  // Create JWT token
  const payload: JWTPayload = {
    userId,
    email,
    sessionId,
  };
  
  const token = jwt.sign(payload, Config.JWT_SECRET, {
    expiresIn: expiresInStr as any,
  });
  
  return { token, sessionId, refreshToken };
}

/**
 * Destroy a session
 * (Called from logout controller)
 */
export async function destroySession(sessionId: string): Promise<void> {
  const db = mongo.getDb();
  const sessionsCollection = db.collection<Session>('sessions');
  await sessionsCollection.deleteOne({ token: sessionId });
}

/**
 * Parse expiresIn string to milliseconds
 */
export function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000; // Default: 7 days
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

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
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify JWT token
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, Config.JWT_SECRET) as JWTPayload;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Check if session exists in database
    const db = mongo.getDb();
    const sessionsCollection = db.collection<Session>('sessions');
    
    const session = await sessionsCollection.findOne({ 
      token: payload.sessionId,
      userId: payload.userId 
    });
    
    if (!session) {
      return res.status(401).json({ error: 'Session not found' });
    }
    
    // Check if session expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await sessionsCollection.deleteOne({ token: payload.sessionId });
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Validate fingerprint to prevent session hijacking
    const currentFingerprint = generateFingerprint(req);
    const fingerprintValid = await validateFingerprint(session, currentFingerprint, req);
    
    if (!fingerprintValid) {
      return res.status(401).json({ error: 'Session security validation failed' });
    }
    
    // Load user from database
    let user;
    try {
      // Convert string userId to ObjectId for MongoDB query
      const userId = new ObjectId(payload.userId);
      user = await db.collection('users').findOne({ _id: userId });
    } catch (error) {
      // Invalid ObjectId format
      return res.status(401).json({ error: 'Invalid user ID' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
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
 * Require admin role middleware
 * Must be used after requireAuth
 * 
 * @deprecated Use requireAdmin from RequireRole.ts instead for full RBAC support
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has admin or root role
  const userRole = (req.user as any).role;
  if (userRole !== 'admin' && userRole !== 'root') {
    return res.status(403).json({ error: 'Admin access required' });
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
  expiresIn: string = Config.JWT_EXPIRES_IN,
  req?: Request
): Promise<{ token: string; sessionId: string }> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  
  // Calculate expiration
  const expiresAt = new Date();
  const expiresInMs = parseExpiresIn(expiresIn);
  expiresAt.setTime(expiresAt.getTime() + expiresInMs);
  
  // Store session in database
  const db = mongo.getDb();
  const sessionsCollection = db.collection<Session>('sessions');
  
  // Generate fingerprint for session hijacking prevention
  const fingerprint = req ? generateFingerprint(req) : undefined;
  
  const session: Session = {
    userId,
    token: sessionId,
    deviceId: req?.get('user-agent') ? crypto.createHash('sha256').update(req.get('user-agent') || '').digest('hex').substring(0, 16) : undefined,
    ipAddress: req?.ip || req?.socket.remoteAddress,
    userAgent: req?.get('user-agent'),
    fingerprint,
    createdAt: new Date(),
    expiresAt,
  };
  
  await sessionsCollection.insertOne(session);
  
  // Create JWT token
  const payload: JWTPayload = {
    userId,
    email,
    sessionId,
  };
  
  const token = jwt.sign(payload, Config.JWT_SECRET, {
    expiresIn,
  });
  
  return { token, sessionId };
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
function parseExpiresIn(expiresIn: string): number {
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

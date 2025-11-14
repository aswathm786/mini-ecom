/**
 * Authentication Middleware
 * 
 * Verifies JWT session tokens and attaches user info to request.
 * 
 * Placeholder implementation using in-memory session storage.
 * Will be replaced with DB-backed sessions collection in later parts.
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { Config } from '../config/Config';
import { JWTPayload } from '../types';
import { mongo } from '../db/Mongo';

// In-memory session storage (placeholder - will use sessions collection later)
// Map<sessionId, { userId: string, expiresAt: Date }>
const sessions = new Map<string, { userId: string; expiresAt: Date }>();

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
    
    // Check if session exists in memory (placeholder)
    const session = sessions.get(payload.sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session not found' });
    }
    
    // Check if session expired
    if (session.expiresAt < new Date()) {
      sessions.delete(payload.sessionId);
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Load user from database
    const db = mongo.getDb();
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
    req.sessionId = payload.sessionId;
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
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has admin role
  // TODO: Implement proper RBAC check from user_roles collection
  // For now, check if user.role === 'admin' or user has admin role
  const userRole = (req.user as any).role;
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

/**
 * Create a new session and return JWT token
 * (Called from login controller)
 */
export function createSession(userId: string, email: string, expiresIn: string = Config.JWT_EXPIRES_IN): { token: string; sessionId: string } {
  const sessionId = crypto.randomBytes(32).toString('hex');
  
  // Calculate expiration
  const expiresAt = new Date();
  const expiresInMs = parseExpiresIn(expiresIn);
  expiresAt.setTime(expiresAt.getTime() + expiresInMs);
  
  // Store session in memory (placeholder)
  sessions.set(sessionId, { userId, expiresAt });
  
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
export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
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

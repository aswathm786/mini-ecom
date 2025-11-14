/**
 * Authentication Controller
 * 
 * Handles user registration, login, and logout.
 * 
 * Placeholder implementation - will be enhanced in later parts with:
 * - Email verification
 * - Role assignment
 * - Device binding
 * - Login alerts
 * - Password reset flow
 */

import { Request, Response } from 'express';
import * as argon2 from 'argon2';
import { z } from 'zod';
import { mongo } from '../db/Mongo';
import { createSession, destroySession } from '../middleware/Auth';
import { User, AuditLog } from '../types';
import { Config } from '../config/Config';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const validated = registerSchema.parse(req.body);
      
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email: validated.email });
      if (existingUser) {
        res.status(400).json({ error: 'User with this email already exists' });
        return;
      }
      
      // Hash password using Argon2id
      const hashedPassword = await argon2.hash(validated.password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,
        parallelism: 4,
      });
      
      // Create user document
      const user: User = {
        email: validated.email,
        password: hashedPassword,
        firstName: validated.firstName,
        lastName: validated.lastName,
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await usersCollection.insertOne(user);
      const userId = result.insertedId.toString();
      
      // Log audit event
      await AuthController.logAudit({
        actorId: userId,
        actorType: 'user',
        action: 'user.register',
        objectType: 'user',
        objectId: userId,
        metadata: { email: validated.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(201).json({
        ok: true,
        message: 'User registered successfully',
        user: {
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/login
   * Authenticate user and create session
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const validated = loginSchema.parse(req.body);
      
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      // Find user by email
      const user = await usersCollection.findOne({ email: validated.email });
      if (!user) {
        // Log failed login attempt
        await AuthController.logAudit({
          actorType: 'system',
          action: 'auth.login.failed',
          metadata: { email: validated.email, reason: 'user_not_found' },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      
      // Verify password
      const passwordValid = await argon2.verify(user.password, validated.password);
      if (!passwordValid) {
        // Log failed login attempt
        await AuthController.logAudit({
          actorId: user._id?.toString(),
          actorType: 'user',
          action: 'auth.login.failed',
          objectType: 'user',
          objectId: user._id?.toString(),
          metadata: { email: validated.email, reason: 'invalid_password' },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      
      // Create session
      const expiresIn = validated.rememberMe ? Config.REMEMBER_ME_EXPIRES_IN : Config.JWT_EXPIRES_IN;
      const { token, sessionId } = createSession(
        user._id!.toString(),
        user.email,
        expiresIn
      );
      
      // Set session cookie
      res.cookie('sessionToken', token, {
        httpOnly: true,
        secure: Config.COOKIE_SECURE,
        sameSite: Config.COOKIE_SAME_SITE,
        maxAge: parseExpiresIn(expiresIn),
      });
      
      // Log successful login
      await AuthController.logAudit({
        actorId: user._id?.toString(),
        actorType: 'user',
        action: 'auth.login.success',
        objectType: 'user',
        objectId: user._id?.toString(),
        metadata: { email: validated.email, sessionId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        user: {
          id: user._id?.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        sessionToken: token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/logout
   * Destroy session and log out user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.sessionId;
      
      if (sessionId) {
        // Destroy session
        destroySession(sessionId);
        
        // Log logout
        await AuthController.logAudit({
          actorId: req.userId,
          actorType: 'user',
          action: 'auth.logout',
          objectType: 'user',
          objectId: req.userId,
          metadata: { sessionId },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      // Clear session cookie
      res.clearCookie('sessionToken');
      
      res.json({ ok: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Helper: Log audit event
   */
  private static async logAudit(log: Omit<AuditLog, '_id' | 'createdAt'>): Promise<void> {
    try {
      const db = mongo.getDb();
      const auditLogsCollection = db.collection<AuditLog>('audit_logs');
      
      await auditLogsCollection.insertOne({
        ...log,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging should not break the request
    }
  }
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


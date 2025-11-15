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
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';
import { createSession, destroySession } from '../middleware/Auth';
import { User, AuditLog, Session, JWTPayload } from '../types';
import { Config } from '../config/Config';
import { emailTriggerService } from '../services/EmailTriggerService';
import { EmailEventType } from '../models/EmailTemplate';

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

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
          // To prevent user enumeration, return a generic success message.
          // The user will not be created, but the potential attacker doesn't know.
          res.status(201).json({ 
              ok: true, 
              message: 'Registration successful. Please check your email to verify your account.' 
          });
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
      
      // Send welcome email (async, don't wait)
      emailTriggerService.sendTemplateEmail(
        EmailEventType.USER_REGISTERED,
        validated.email,
        {
          userName: validated.firstName || validated.email,
          userEmail: validated.email,
        }
      ).catch(err => {
        console.error('Failed to send welcome email:', err);
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
      
      // Get session expiration from settings (configurable by admin)
      // Default to REMEMBER_ME_EXPIRES_IN if rememberMe is checked, otherwise use configured session expiration
      const sessionExpiresIn = Config.get('auth.session.expires_in', Config.JWT_EXPIRES_IN);
      const expiresIn = validated.rememberMe ? Config.REMEMBER_ME_EXPIRES_IN : sessionExpiresIn;
      
      const { token, sessionId, refreshToken } = await createSession(
        user._id!.toString(),
        user.email,
        expiresIn,
        req
      );
      
      // Set session cookie
      res.cookie('sessionToken', token, {
        httpOnly: true,
        secure: Config.COOKIE_SECURE,
        sameSite: Config.COOKIE_SAME_SITE,
        maxAge: parseExpiresIn(expiresIn),
      });
      
      // Set refresh token cookie (longer expiration)
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: Config.COOKIE_SECURE,
        sameSite: Config.COOKIE_SAME_SITE,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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
      
      // Send login alert email (async, don't wait)
      emailTriggerService.sendTemplateEmail(
        EmailEventType.USER_LOGIN_ALERT,
        validated.email,
        {
          userName: user.firstName || user.email,
          userEmail: user.email,
          ipAddress: req.ip,
          userAgent: req.get('user-agent') || 'Unknown',
          loginTime: new Date().toLocaleString(),
        }
      ).catch(err => {
        console.error('Failed to send login alert email:', err);
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
        await destroySession(sessionId);
        
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
      
      // Clear session cookies
      res.clearCookie('sessionToken');
      res.clearCookie('refreshToken');
      
      res.json({ ok: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      // Find user by email
      const user = await usersCollection.findOne({ email: validated.email });
      
      // Always return success to prevent email enumeration
      if (!user) {
        res.json({
          ok: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        });
        return;
      }
      
      // Generate secure token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      // Set token expiry (1 hour)
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1);
      
      // Store hashed token in user document
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: resetExpires,
            updatedAt: new Date(),
          },
        }
      );
      
      // Generate reset link
      const frontendUrl = Config.get('FRONTEND_URL', 'http://localhost:5173');
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
      
      // Send password reset email
      await emailTriggerService.sendTemplateEmail(
        EmailEventType.PASSWORD_RESET,
        validated.email,
        {
          userName: user.firstName || user.email,
          resetLink,
        },
        {
          isImportant: true,
          skipPreferences: true, // Always send password reset emails
        }
      );
      
      // Log audit event
      await AuthController.logAudit({
        actorId: user._id?.toString(),
        actorType: 'user',
        action: 'auth.password.reset.requested',
        objectType: 'user',
        objectId: user._id?.toString(),
        metadata: { email: validated.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      
      console.error('Forgot password error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      // Hash the provided token
      const hashedToken = crypto.createHash('sha256').update(validated.token).digest('hex');
      
      // Find user by token and check expiry
      const user = await usersCollection.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      });
      
      if (!user) {
        res.status(400).json({
          ok: false,
          error: 'Invalid or expired reset token',
        });
        return;
      }
      
      // Hash new password
      const hashedPassword = await argon2.hash(validated.password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
      
      // Update password and clear reset token
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
          $unset: {
            resetPasswordToken: '',
            resetPasswordExpires: '',
          },
        }
      );
      
      // Send password changed confirmation email
      await emailTriggerService.sendTemplateEmail(
        EmailEventType.PASSWORD_CHANGED,
        user.email,
        {
          userName: user.firstName || user.email,
        },
        {
          isImportant: true,
          skipPreferences: true,
        }
      );
      
      // Log audit event
      await AuthController.logAudit({
        actorId: user._id?.toString(),
        actorType: 'user',
        action: 'auth.password.reset.completed',
        objectType: 'user',
        objectId: user._id?.toString(),
        metadata: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      
      console.error('Reset password error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/auth/send-verification
   * Send email verification
   */
  static async sendVerificationEmail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
      
      if (!user) {
        res.status(404).json({
          ok: false,
          error: 'User not found',
        });
        return;
      }
      
      if (user.isEmailVerified) {
        res.json({
          ok: true,
          message: 'Email is already verified',
        });
        return;
      }
      
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
      
      // Set token expiry (24 hours)
      const verificationExpires = new Date();
      verificationExpires.setHours(verificationExpires.getHours() + 24);
      
      // Store token in user document
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            emailVerificationToken: hashedToken,
            emailVerificationExpires: verificationExpires,
            updatedAt: new Date(),
          },
        }
      );
      
      // Generate verification link
      const frontendUrl = Config.get('FRONTEND_URL', 'http://localhost:5173');
      const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;
      
      // Send verification email
      await emailTriggerService.sendTemplateEmail(
        EmailEventType.EMAIL_VERIFICATION,
        user.email,
        {
          userName: user.firstName || user.email,
          verificationLink,
        },
        {
          isImportant: true,
          skipPreferences: true,
        }
      );
      
      res.json({
        ok: true,
        message: 'Verification email sent',
      });
    } catch (error) {
      console.error('Send verification email error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/auth/verify-email
   * Verify email with token
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        res.status(400).json({
          ok: false,
          error: 'Verification token is required',
        });
        return;
      }
      
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      // Hash the provided token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      // Find user by token and check expiry
      const user = await usersCollection.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: new Date() },
      });
      
      if (!user) {
        res.status(400).json({
          ok: false,
          error: 'Invalid or expired verification token',
        });
        return;
      }
      
      // Update user as verified and clear token
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            isEmailVerified: true,
            updatedAt: new Date(),
          },
          $unset: {
            emailVerificationToken: '',
            emailVerificationExpires: '',
          },
        }
      );
      
      // Log audit event
      await AuthController.logAudit({
        actorId: user._id?.toString(),
        actorType: 'user',
        action: 'auth.email.verified',
        objectType: 'user',
        objectId: user._id?.toString(),
        metadata: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/auth/refresh-token
   * Refresh access token using refresh token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        res.status(401).json({
          ok: false,
          error: 'Refresh token required',
        });
        return;
      }
      
      const db = mongo.getDb();
      const sessionsCollection = db.collection<Session>('sessions');
      const usersCollection = db.collection<User>('users');
      
      // Find session by refresh token
      const session = await sessionsCollection.findOne({
        refreshToken,
        refreshExpiresAt: { $gt: new Date() },
      });
      
      if (!session) {
        res.status(401).json({
          ok: false,
          error: 'Invalid or expired refresh token',
        });
        return;
      }
      
      // Check if refresh token expired
      if (session.refreshExpiresAt && session.refreshExpiresAt < new Date()) {
        await sessionsCollection.deleteOne({ refreshToken });
        res.status(401).json({
          ok: false,
          error: 'Refresh token expired',
        });
        return;
      }
      
      // Get user
      const user = await usersCollection.findOne({ _id: new ObjectId(session.userId) });
      if (!user) {
        res.status(401).json({
          ok: false,
          error: 'User not found',
        });
        return;
      }
      
      // Check if user is blocked
      if (user.status === 'suspended' || user.status === 'deleted') {
        await sessionsCollection.deleteMany({ userId: session.userId });
        res.status(403).json({
          ok: false,
          error: 'Account is suspended or deleted',
        });
        return;
      }
      
      // Generate new access token
      const sessionExpiresIn = Config.get('auth.session.expires_in', Config.JWT_EXPIRES_IN);
      const expiresIn = sessionExpiresIn;
      
      const payload: JWTPayload = {
        userId: session.userId,
        email: user.email,
        sessionId: session.token,
      };
      
      const token = jwt.sign(payload, Config.JWT_SECRET, {
        expiresIn,
      });
      
      // Update session expiration
      const expiresAt = new Date();
      const expiresInMs = parseExpiresIn(expiresIn);
      expiresAt.setTime(expiresAt.getTime() + expiresInMs);
      
      await sessionsCollection.updateOne(
        { refreshToken },
        {
          $set: {
            expiresAt,
            updatedAt: new Date(),
          },
        }
      );
      
      // Set new session cookie
      res.cookie('sessionToken', token, {
        httpOnly: true,
        secure: Config.COOKIE_SECURE,
        sameSite: Config.COOKIE_SAME_SITE,
        maxAge: expiresInMs,
      });
      
      res.json({
        ok: true,
        token,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
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


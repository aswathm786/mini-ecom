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
import { createSession, destroySession, parseExpiresIn } from '../middleware/Auth';
import { User, AuditLog, Session, JWTPayload, ResetPasswordToken } from '../types';
import { Config } from '../config/Config';
import { emailTriggerService } from '../services/EmailTriggerService';
import { EmailEventType } from '../models/EmailTemplate';
import { otpService } from '../services/OTPService';
import { verifyGoogleIdToken } from '../services/GoogleOAuthService';
import { twoFactorService } from '../services/TwoFactorService';
import { validatePassword } from '../utils/passwordValidator';
import { getServerTime, isExpired } from '../utils/serverTime';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  code: z.string().optional(), // 2FA code (optional, required only if 2FA is enabled)
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(1, 'Password is required'),
});

const googleLoginSchema = z.object({
  idToken: z.string().min(20, 'Google credential is required'),
  rememberMe: z.boolean().optional(),
  code: z.string().optional(), // 2FA code (optional, required only if 2FA is enabled)
});

export class AuthController {
  /**
   * Helper function to set session cookies with consistent configuration
   */
  private static setSessionCookies(
    res: Response,
    sessionToken: string,
    refreshToken: string,
    maxAge: number
  ): void {
    // In development, use 'Lax' for sameSite to allow cross-port requests
    // In production, use configured value
    const sameSite = Config.NODE_ENV === 'development' ? 'Lax' : Config.COOKIE_SAME_SITE;
    const cookieOptions: any = {
      httpOnly: true,
      secure: Config.COOKIE_SECURE,
      sameSite: sameSite as 'strict' | 'lax' | 'none',
      path: '/', // Ensure cookie is available for all paths
    };

    // Don't set domain in development (allows localhost on any port)
    // In production, only set domain if explicitly configured
    if (Config.NODE_ENV !== 'development') {
      const cookieDomain = Config.get('COOKIE_DOMAIN', undefined);
      if (cookieDomain) {
        cookieOptions.domain = cookieDomain;
      }
    }

    res.cookie('sessionToken', sessionToken, {
      ...cookieOptions,
      maxAge: maxAge,
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  /**
   * POST /api/auth/register
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const validated = registerSchema.parse(req.body);
      
      // Validate password against policy
      const passwordValidation = validatePassword(validated.password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          error: 'Password validation failed',
          details: passwordValidation.errors.map(error => ({ message: error })),
        });
        return;
      }
      
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

      await ensureCustomerRoleAssigned(userId);
      
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
      
      // Check if user is blocked/suspended
      if (user.status === 'suspended' || user.status === 'deleted') {
        await AuthController.logAudit({
          actorId: user._id?.toString(),
          actorType: 'user',
          action: 'auth.login.failed',
          objectType: 'user',
          objectId: user._id?.toString(),
          metadata: { email: validated.email, reason: 'user_blocked', status: user.status },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        
        res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
        return;
      }
      
      // Step 1: Verify email and password FIRST
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
      
      // Step 2: Password is valid, now check if 2FA is enabled
      const is2FAEnabled = await twoFactorService.isEnabled(user._id!.toString());
      const { code } = req.body;
      
      // Step 3: If 2FA is enabled, handle 2FA verification
      if (is2FAEnabled) {
        // If no 2FA code provided, request it (NO session created yet)
        if (!code) {
          res.status(200).json({
            ok: true,
            requires2FA: true,
            message: 'Please enter your 2FA code',
          });
          return;
        }
        
        // Step 4: Verify the 2FA code
        const isValidCode = await twoFactorService.verifyCode(user._id!.toString(), code);
        if (!isValidCode) {
          await AuthController.logAudit({
            actorId: user._id?.toString(),
            actorType: 'user',
            action: 'auth.login.failed',
            objectType: 'user',
            objectId: user._id?.toString(),
            metadata: { email: validated.email, reason: 'invalid_2fa_code' },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
          
          res.status(401).json({ error: 'Invalid code' });
          return;
        }
      }
      
      // Step 5: At this point, authentication is complete:
      // - Email and password are verified
      // - If 2FA was enabled, 2FA code is verified
      // - Now create session (same way for users with or without 2FA)
      
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
      
      // Set session cookies BEFORE sending response
      // This ensures cookies are included in the Set-Cookie header
      AuthController.setSessionCookies(res, token, refreshToken, parseExpiresIn(expiresIn));
      
      // Log successful login (async, don't block response)
      AuthController.logAudit({
        actorId: user._id?.toString(),
        actorType: 'user',
        action: 'auth.login.success',
        objectType: 'user',
        objectId: user._id?.toString(),
        metadata: { email: validated.email, sessionId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }).catch(err => {
        console.error('Failed to log audit:', err);
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

      // Send response with explicit 200 status to ensure cookies are sent
      res.status(200).json({
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
   * POST /api/auth/google
   * Authenticate using Google One Tap / OAuth ID token
   */
  static async loginWithGoogle(req: Request, res: Response): Promise<void> {
    try {
      const validated = googleLoginSchema.parse(req.body);

      const googleProfile = await verifyGoogleIdToken(validated.idToken);

      if (!googleProfile.emailVerified) {
        res.status(400).json({ ok: false, error: 'Google account email is not verified' });
        return;
      }

      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');

      let user = await usersCollection.findOne({ email: googleProfile.email });

      if (!user) {
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await argon2.hash(randomPassword, {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        });

        const newUser: User = {
          email: googleProfile.email,
          password: hashedPassword,
          firstName: googleProfile.firstName,
          lastName: googleProfile.lastName,
          isEmailVerified: true,
          role: 'user',
          authProvider: 'google',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const insertResult = await usersCollection.insertOne(newUser);
        const insertedId = insertResult.insertedId.toString();
        await ensureCustomerRoleAssigned(insertedId);
        user = await usersCollection.findOne({ _id: insertResult.insertedId } as any);
        if (!user) {
          throw new Error('Failed to create user');
        }

        await AuthController.logAudit({
          actorId: user._id?.toString(),
          actorType: 'user',
          action: 'user.register.google',
          objectType: 'user',
          objectId: user._id?.toString(),
          metadata: { email: googleProfile.email },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      } else if (user.authProvider !== 'google') {
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              authProvider: 'google',
              isEmailVerified: true,
              updatedAt: getServerTime(),
            },
          }
        );
        user.authProvider = 'google';
        user.isEmailVerified = true;
      }

      // Check if user is blocked/suspended
      if (user.status === 'suspended' || user.status === 'deleted') {
        await AuthController.logAudit({
          actorId: user._id?.toString(),
          actorType: 'user',
          action: 'auth.login.failed',
          objectType: 'user',
          objectId: user._id?.toString(),
          metadata: { email: googleProfile.email, reason: 'user_blocked', status: user.status },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        
        res.status(403).json({ ok: false, error: 'Your account has been blocked. Please contact support.' });
        return;
      }

      // Step 1: Google authentication is valid, now check if 2FA is enabled
      const is2FAEnabled = await twoFactorService.isEnabled(user._id!.toString());
      const { code } = validated;
      
      // Step 2: If 2FA is enabled, handle 2FA verification
      if (is2FAEnabled) {
        // If no 2FA code provided, request it (NO session created yet)
        if (!code) {
          res.status(200).json({
            ok: true,
            requires2FA: true,
            message: 'Please enter your 2FA code',
          });
          return;
        }
        
        // Step 3: Verify the 2FA code
        const isValidCode = await twoFactorService.verifyCode(user._id!.toString(), code);
        if (!isValidCode) {
          await AuthController.logAudit({
            actorId: user._id?.toString(),
            actorType: 'user',
            action: 'auth.login.failed',
            objectType: 'user',
            objectId: user._id?.toString(),
            metadata: { email: googleProfile.email, reason: 'invalid_2fa_code' },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
          
          res.status(401).json({ ok: false, error: 'Invalid code' });
          return;
        }
      }
      
      // Step 4: At this point, authentication is complete:
      // - Google authentication is verified
      // - If 2FA was enabled, 2FA code is verified
      // - Now create session (same way for users with or without 2FA)

      const sessionExpiresIn = Config.get('auth.session.expires_in', Config.JWT_EXPIRES_IN);
      const expiresIn = validated.rememberMe ? Config.REMEMBER_ME_EXPIRES_IN : sessionExpiresIn;

      const { token, sessionId, refreshToken } = await createSession(
        user._id!.toString(),
        user.email,
        expiresIn,
        req
      );

      // Set session cookies
      AuthController.setSessionCookies(res, token, refreshToken, parseExpiresIn(expiresIn));

      await AuthController.logAudit({
        actorId: user._id?.toString(),
        actorType: 'user',
        action: 'auth.login.google',
        objectType: 'user',
        objectId: user._id?.toString(),
        metadata: { provider: 'google', sessionId },
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
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      console.error('Google login error:', error);
      res.status(500).json({ ok: false, error: 'Unable to authenticate with Google' });
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
      
      // Generate secure token and check if it's already used
      const resetTokensCollection = db.collection<ResetPasswordToken>('reset_password_tokens');
      let resetToken: string = '';
      let hashedToken: string = '';
      let tokenFound = false;
      let maxAttempts = 10; // Prevent infinite loop
      
      // Keep generating tokens until we find one that doesn't exist
      while (!tokenFound && maxAttempts > 0) {
        resetToken = crypto.randomBytes(32).toString('hex');
        hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Check if this token hash already exists
        const existingToken = await resetTokensCollection.findOne({ tokenHash: hashedToken });
        if (!existingToken) {
          tokenFound = true;
        }
        maxAttempts--;
      }
      
      if (!tokenFound || !resetToken || !hashedToken) {
        // This should never happen, but handle it just in case
        throw new Error('Failed to generate unique reset token after multiple attempts');
      }
      
      // Set token expiry (1 hour) - using server time
      const resetExpires = getServerTime();
      resetExpires.setHours(resetExpires.getHours() + 1);
      
      // Store token in separate collection
      await resetTokensCollection.insertOne({
        userId: user._id?.toString() || '',
        tokenHash: hashedToken,
        used: false,
        expiresAt: resetExpires,
        createdAt: getServerTime(),
      });
      
      // Also store hashed token in user document for backward compatibility
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            resetPasswordToken: hashedToken,
            resetPasswordExpires: resetExpires,
            updatedAt: getServerTime(),
          },
        }
      );
      
      // Generate reset link
      const frontendUrl = Config.get('FRONTEND_URL', 'http://localhost:5173');
      const resetLink = `${frontendUrl}/password/reset?token=${resetToken}`;
      
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
   * GET /api/auth/validate-reset-token
   * Validate reset password token
   */
  static async validateResetToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        res.status(400).json({
          ok: false,
          error: 'Token is required',
        });
        return;
      }
      
      const db = mongo.getDb();
      const resetTokensCollection = db.collection<ResetPasswordToken>('reset_password_tokens');
      
      // Hash the provided token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      // Find token in separate collection
      const tokenRecord = await resetTokensCollection.findOne({
        tokenHash: hashedToken,
      });
      
      if (!tokenRecord) {
        res.status(400).json({
          ok: false,
          error: 'Invalid reset token',
        });
        return;
      }
      
      // Check if token has been used
      if (tokenRecord.used) {
        res.status(400).json({
          ok: false,
          error: 'Reset link has already been used',
        });
        return;
      }
      
      // Check if token has expired - using server time
      if (isExpired(tokenRecord.expiresAt)) {
        res.status(400).json({
          ok: false,
          error: 'Reset link has expired',
        });
        return;
      }
      
      res.json({
        ok: true,
        message: 'Token is valid',
      });
    } catch (error) {
      console.error('Validate reset token error:', error);
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
      
      // Validate password against policy
      const passwordValidation = validatePassword(validated.password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          ok: false,
          error: 'Password validation failed',
          details: passwordValidation.errors.map(error => ({ message: error })),
        });
        return;
      }
      
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      const resetTokensCollection = db.collection<ResetPasswordToken>('reset_password_tokens');
      
      // Hash the provided token
      const hashedToken = crypto.createHash('sha256').update(validated.token).digest('hex');
      
      // Find token in separate collection
      const tokenRecord = await resetTokensCollection.findOne({
        tokenHash: hashedToken,
      });
      
      if (!tokenRecord) {
        res.status(400).json({
          ok: false,
          error: 'Invalid reset token',
        });
        return;
      }
      
      // Check if token has been used
      if (tokenRecord.used) {
        res.status(400).json({
          ok: false,
          error: 'Reset link has already been used',
        });
        return;
      }
      
      // Check if token has expired - using server time
      if (isExpired(tokenRecord.expiresAt)) {
        res.status(400).json({
          ok: false,
          error: 'Reset link has expired',
        });
        return;
      }
      
      // Get user by userId from token record
      const user = await usersCollection.findOne({ _id: new ObjectId(tokenRecord.userId) } as any);
      
      if (!user) {
        res.status(400).json({
          ok: false,
          error: 'User not found',
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
      
      // Mark token as used in separate collection
      await resetTokensCollection.updateOne(
        { _id: tokenRecord._id },
        {
          $set: {
            used: true,
            usedAt: getServerTime(),
          },
        }
      );
      
      // Update password and clear reset token from user document
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            updatedAt: getServerTime(),
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
      
      const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) } as any);
      
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
      
      // Set token expiry (24 hours) - using server time
      const verificationExpires = getServerTime();
      verificationExpires.setHours(verificationExpires.getHours() + 24);
      
      // Store token in user document
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            emailVerificationToken: hashedToken,
            emailVerificationExpires: verificationExpires,
            updatedAt: getServerTime(),
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
      
      // Find user by token and check expiry - using server time
      const serverTime = getServerTime();
      const user = await usersCollection.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: serverTime },
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
            updatedAt: getServerTime(),
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
   * POST /api/auth/otp/request
   * Request OTP for email-based login
   */
  static async requestOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        res.status(400).json({
          ok: false,
          error: 'Email is required',
        });
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          ok: false,
          error: 'Invalid email address',
        });
        return;
      }
      
      // Generate and send OTP
      const result = await otpService.generateAndSendOTP(email, 'login');
      
      if (!result.success) {
        res.status(400).json({
          ok: false,
          error: result.message,
        });
        return;
      }
      
      // Log audit event (don't reveal if user exists)
      await AuthController.logAudit({
        actorType: 'system',
        action: 'auth.otp.requested',
        metadata: { email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({
        ok: true,
        message: result.message,
      });
    } catch (error) {
      console.error('OTP request error:', error);
      res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/auth/otp/verify
   * Verify OTP and login user
   */
  static async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, twoFACode } = req.body;
      
      if (!email || !code) {
        res.status(400).json({
          ok: false,
          error: 'Email and OTP code are required',
        });
        return;
      }
      
      // OTP verified - find or create user first to check 2FA status
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      
      let user = await usersCollection.findOne({ email });
      
      // If user doesn't exist, create account
      if (!user) {
        const newUser: User = {
          email,
          password: '', // No password for OTP-only accounts
          isEmailVerified: true, // OTP verification counts as email verification
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const result = await usersCollection.insertOne(newUser);
        user = { ...newUser, _id: result.insertedId.toString() };

        await ensureCustomerRoleAssigned(user._id!.toString());
        
        // Log registration
        await AuthController.logAudit({
          actorId: user._id,
          actorType: 'user',
          action: 'user.register.otp',
          objectType: 'user',
          objectId: user._id,
          metadata: { email },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        
        // Send welcome email
        emailTriggerService.sendTemplateEmail(
          EmailEventType.USER_REGISTERED,
          email,
          { userName: email, userEmail: email }
        ).catch(err => {
          console.error('Failed to send welcome email:', err);
        });
      }
      
      // Check if user is blocked
      if (user.status === 'suspended' || user.status === 'deleted') {
        res.status(403).json({
          ok: false,
          error: 'Account is suspended or deleted',
        });
        return;
      }
      
      // Check if 2FA is enabled for this user
      const is2FAEnabled = await twoFactorService.isEnabled(user._id!.toString());
      const twoFACodeToUse = req.body.twoFACode;
      
      // If 2FA is enabled and no 2FA code provided, verify OTP but don't mark as used yet
      if (is2FAEnabled && !twoFACodeToUse) {
        // Verify OTP but don't mark as used (will be marked after 2FA verification)
        const verification = await (otpService as any).verifyOTP(email, code, 'login', false);
        
        if (!verification.valid) {
          // Log failed attempt
          await AuthController.logAudit({
            actorType: 'system',
            action: 'auth.otp.verification.failed',
            metadata: { email, reason: verification.message },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
          
          res.status(400).json({
            ok: false,
            error: verification.message,
          });
          return;
        }
        
        // OTP is valid, but 2FA is required - request 2FA code
        res.status(200).json({
          ok: true,
          requires2FA: true,
          message: 'Please enter your 2FA code',
        });
        return;
      }
      
      // Verify OTP (mark as used if 2FA is not enabled or 2FA code is provided)
      const markOTPAsUsed = !is2FAEnabled || !!twoFACodeToUse;
      const verification = await (otpService as any).verifyOTP(email, code, 'login', markOTPAsUsed);
      
      if (!verification.valid) {
        // Log failed attempt
        await AuthController.logAudit({
          actorType: 'system',
          action: 'auth.otp.verification.failed',
          metadata: { email, reason: verification.message },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        
        res.status(400).json({
          ok: false,
          error: verification.message,
        });
        return;
      }
      
      // If 2FA is enabled, verify the 2FA code
      if (is2FAEnabled && twoFACodeToUse) {
        // Verify the 2FA code
        const isValidCode = await twoFactorService.verifyCode(user._id!.toString(), twoFACodeToUse);
        if (!isValidCode) {
          await AuthController.logAudit({
            actorId: user._id?.toString(),
            actorType: 'user',
            action: 'auth.login.otp.failed',
            objectType: 'user',
            objectId: user._id?.toString(),
            metadata: { email, reason: 'invalid_2fa_code' },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
          
          res.status(401).json({ 
            ok: false,
            error: 'Invalid 2FA code' 
          });
          return;
        }
        
        // Both OTP and 2FA verified - mark OTP as used now
        if (!markOTPAsUsed) {
          const otpCollection = db.collection('otps');
          await otpCollection.updateOne(
            { email, purpose: 'login', used: false },
            { $set: { used: true } }
          );
        }
      }
      
      // At this point, authentication is complete:
      // - OTP is verified
      // - If 2FA was enabled, 2FA code is verified
      // - Now create session (same way for users with or without 2FA)
      
      // Create session
      const sessionExpiresIn = Config.get('auth.session.expires_in', Config.JWT_EXPIRES_IN);
      const { token, sessionId, refreshToken } = await createSession(
        user._id!.toString(),
        user.email,
        sessionExpiresIn,
        req
      );
      
      // Set cookies
      // Set session cookies
      AuthController.setSessionCookies(res, token, refreshToken, parseExpiresIn(sessionExpiresIn));
      
      // Log successful login
      await AuthController.logAudit({
        actorId: user._id?.toString(),
        actorType: 'user',
        action: 'auth.login.otp.success',
        objectType: 'user',
        objectId: user._id?.toString(),
        metadata: { email, sessionId, has2FA: is2FAEnabled },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      // Send login alert
      emailTriggerService.sendTemplateEmail(
        EmailEventType.USER_LOGIN_ALERT,
        email,
        {
          userName: user.firstName || email,
          userEmail: email,
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
      console.error('OTP verification error:', error);
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
      
      // Find session by refresh token - using server time
      const serverTime = getServerTime();
      const session = await sessionsCollection.findOne({
        refreshToken,
        refreshExpiresAt: { $gt: serverTime },
      });
      
      if (!session) {
        res.status(401).json({
          ok: false,
          error: 'Invalid or expired refresh token',
        });
        return;
      }
      
      // Check if refresh token expired - using server time
      if (isExpired(session.refreshExpiresAt)) {
        await sessionsCollection.deleteOne({ refreshToken });
        res.status(401).json({
          ok: false,
          error: 'Refresh token expired',
        });
        return;
      }
      
      // Get user
      const user = await usersCollection.findOne({ _id: new ObjectId(session.userId) } as any);
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
            updatedAt: getServerTime(),
          },
        }
      );
      
      // Set new session cookie
      // Set session cookies (refresh token not needed for token refresh)
      AuthController.setSessionCookies(res, token, refreshToken || token, expiresInMs);
      
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
   * POST /api/auth/2fa/generate
   * Generate 2FA secret and QR code for setup
   */
  static async generate2FA(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      // Get user email for QR code
      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');
      const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) } as any);
      const userEmail = user?.email;

      const result = await twoFactorService.generateSecret(req.userId, userEmail);

      await AuthController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'auth.2fa.generate',
        objectType: 'user',
        objectId: req.userId,
        metadata: {},
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        ok: true,
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
        backupCodes: result.backupCodes,
      });
    } catch (error) {
      console.error('2FA generation error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/2fa/enable
   * Enable 2FA after verifying code
   */
  static async enable2FA(req: Request, res: Response): Promise<void> {
    try {
      const { code } = z.object({ code: z.string().length(6) }).parse(req.body);

      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const enabled = await twoFactorService.enable(req.userId, code);

      if (!enabled) {
        res.status(400).json({ ok: false, error: 'Invalid verification code' });
        return;
      }

      await AuthController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'auth.2fa.enabled',
        objectType: 'user',
        objectId: req.userId,
        metadata: {},
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ ok: true, message: '2FA enabled successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Invalid code format' });
        return;
      }
      console.error('2FA enable error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/2fa/disable
   * Disable 2FA
   */
  static async disable2FA(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      await twoFactorService.disable(req.userId);

      await AuthController.logAudit({
        actorId: req.userId,
        actorType: 'user',
        action: 'auth.2fa.disabled',
        objectType: 'user',
        objectId: req.userId,
        metadata: {},
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ ok: true, message: '2FA disabled successfully' });
    } catch (error) {
      console.error('2FA disable error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/2fa/verify
   * Verify 2FA code during login
   */
  static async verify2FA(req: Request, res: Response): Promise<void> {
    try {
      const { code, isBackupCode } = z
        .object({
          code: z.string().min(1),
          isBackupCode: z.boolean().optional(),
        })
        .parse(req.body);

      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const isValid = await twoFactorService.verifyCode(
        req.userId,
        code,
        isBackupCode || false
      );

      if (!isValid) {
        await AuthController.logAudit({
          actorId: req.userId,
          actorType: 'system',
          action: 'auth.2fa.verification.failed',
          metadata: { isBackupCode },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        res.status(400).json({ ok: false, error: 'Invalid 2FA code' });
        return;
      }

      res.json({ ok: true, message: '2FA verified successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Invalid request' });
        return;
      }
      console.error('2FA verify error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }

  /**
   * GET /api/auth/2fa/status
   * Check if 2FA is enabled
   */
  static async get2FAStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const isEnabled = await twoFactorService.isEnabled(req.userId);
      const backupCodesCount = isEnabled
        ? await twoFactorService.getBackupCodesCount(req.userId)
        : 0;

      res.json({
        ok: true,
        enabled: isEnabled,
        backupCodesCount,
      });
    } catch (error) {
      console.error('2FA status error:', error);
      res.status(500).json({ ok: false, error: 'Internal server error' });
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

async function ensureRoleExists(
  name: string,
  description: string,
  permissions: string[] = [],
  isSystem = false
) {
  const db = mongo.getDb();
  const rolesCollection = db.collection('roles');
  const now = new Date();

  let role = await rolesCollection.findOne({ name });
  if (!role) {
    const result = await rolesCollection.insertOne({
      name,
      description,
      permissions,
      isSystem,
      createdAt: now,
      updatedAt: now,
    });
    role = {
      _id: result.insertedId,
      name,
      description,
      permissions,
    } as any;
  }

  return role;
}

async function ensureCustomerRoleAssigned(userId: string): Promise<void> {
  const db = mongo.getDb();
  const userRolesCollection = db.collection('user_roles');
  const usersCollection = db.collection<User>('users');

  const existingAssignment = await userRolesCollection.findOne({ userId });
  if (existingAssignment) {
    return;
  }

  const customerRole = await ensureRoleExists(
    'customer',
    'Default storefront customer role',
    [],
    true
  );

  await userRolesCollection.updateOne(
    { userId, roleId: customerRole._id },
    {
      $set: {
        userId,
        roleId: customerRole._id,
        roleName: customerRole.name,
        assignedAt: new Date(),
      },
    },
    { upsert: true }
  );

  await usersCollection.updateOne(
    { _id: new ObjectId(userId) } as any,
    {
      $set: {
        role: customerRole.name,
        roles: [customerRole.name],
        updatedAt: new Date(),
      },
    }
  );
}



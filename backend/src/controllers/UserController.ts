/**
 * User Controller
 * 
 * Handles user account operations including email preferences.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { User, AuditLog } from '../types';
import { validatePassword } from '../utils/passwordValidator';
import { emailTriggerService } from '../services/EmailTriggerService';
import { EmailEventType } from '../models/EmailTemplate';

const updateEmailPreferencesSchema = z.object({
  marketing: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  transactional: z.boolean().optional(),
}).passthrough(); // Allow additional event types

export class UserController {
  /**
   * GET /api/mobile/profile
   * Get user profile (for mobile API)
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');

      const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
      
      if (!user) {
        res.status(404).json({ ok: false, error: 'User not found' });
        return;
      }

      // Return compact profile (mobile-friendly)
      res.json({
        ok: true,
        data: {
          _id: user._id?.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          emailPreferences: user.emailPreferences || {},
        },
      });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch profile',
      });
    }
  }

  /**
   * PUT /api/mobile/profile
   * Update user profile (for mobile API)
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const updateSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional(),
      });

      const validated = updateSchema.parse(req.body);

      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');

      await usersCollection.updateOne(
        { _id: new ObjectId(req.userId) },
        {
          $set: {
            ...validated,
            updatedAt: new Date(),
          },
        }
      );

      // Get updated user
      const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });

      res.json({
        ok: true,
        message: 'Profile updated',
        data: {
          _id: user?._id?.toString(),
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          phone: user?.phone,
        },
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

      console.error('Error updating profile:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update profile',
      });
    }
  }

  /**
   * GET /api/user/email-preferences
   * Get user email preferences
   */
  static async getEmailPreferences(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');

      const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
      
      if (!user) {
        res.status(404).json({ ok: false, error: 'User not found' });
        return;
      }

      res.json({
        ok: true,
        data: user.emailPreferences || {},
      });
    } catch (error) {
      console.error('Error getting email preferences:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch email preferences',
      });
    }
  }

  /**
   * PUT /api/user/email-preferences
   * Update user email preferences
   */
  static async updateEmailPreferences(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      // Validate input
      const validated = updateEmailPreferencesSchema.parse(req.body);

      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');

      // Get current user to merge preferences
      const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
      
      if (!user) {
        res.status(404).json({ ok: false, error: 'User not found' });
        return;
      }

      // Merge with existing preferences
      const currentPreferences = user.emailPreferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        ...validated,
      };

      // Update user document
      await usersCollection.updateOne(
        { _id: new ObjectId(req.userId) },
        {
          $set: {
            emailPreferences: updatedPreferences,
            updatedAt: new Date(),
          },
        }
      );

      res.json({
        ok: true,
        message: 'Email preferences updated',
        data: updatedPreferences,
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

      console.error('Error updating email preferences:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update email preferences',
      });
    }
  }

  /**
   * GET /api/me/sessions
   * List user's active sessions
   */
  static async listSessions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const db = mongo.getDb();
      const sessionsCollection = db.collection('sessions');
      // Get current session ID from request (set by requireAuth middleware)
      const currentSessionId = (req as any).sessionId;

      const sessions = await sessionsCollection
        .find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .toArray();

      const formattedSessions = sessions.map(session => ({
        _id: session._id?.toString(),
        deviceId: session.deviceId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastActive: session.lastActive || session.createdAt,
        createdAt: session.createdAt,
        isCurrent: session._id?.toString() === currentSessionId,
      }));

      res.json({
        ok: true,
        data: formattedSessions,
      });
    } catch (error) {
      console.error('Error listing sessions:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch sessions',
      });
    }
  }

  /**
   * POST /api/me/sessions/:sessionId/revoke
   * Revoke a specific session
   */
  static async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const sessionId = req.params.sessionId;
      const db = mongo.getDb();
      const sessionsCollection = db.collection('sessions');

      // Verify session belongs to user
      const session = await sessionsCollection.findOne({ 
        _id: new ObjectId(sessionId),
        userId: req.userId,
      });

      if (!session) {
        res.status(404).json({ ok: false, error: 'Session not found' });
        return;
      }

      // Delete session
      await sessionsCollection.deleteOne({ _id: new ObjectId(sessionId) });

      res.json({
        ok: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      console.error('Error revoking session:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to revoke session',
      });
    }
  }

  /**
   * GET /api/addresses
   * List user's addresses
   */
  static async listAddresses(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const db = mongo.getDb();
      const addressesCollection = db.collection('addresses');

      const addresses = await addressesCollection
        .find({ userId: req.userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .toArray();

      res.json({
        ok: true,
        data: addresses.map(addr => ({
          _id: addr._id?.toString(),
          name: addr.name,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          country: addr.country,
          phone: addr.phone,
          isDefault: addr.isDefault || false,
        })),
      });
    } catch (error) {
      console.error('Error listing addresses:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch addresses',
      });
    }
  }

  /**
   * POST /api/addresses
   * Create a new address
   */
  static async createAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const addressSchema = z.object({
        name: z.string().min(1),
        street: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        pincode: z.string().min(1),
        country: z.string().min(1),
        phone: z.string().optional(),
      });

      const validated = addressSchema.parse(req.body);

      const db = mongo.getDb();
      const addressesCollection = db.collection('addresses');

      // If this is the first address or user wants it as default, set it as default
      const existingCount = await addressesCollection.countDocuments({ userId: req.userId });
      const isDefault = existingCount === 0 || req.body.isDefault === true;

      // If setting as default, unset other defaults
      if (isDefault) {
        await addressesCollection.updateMany(
          { userId: req.userId },
          { $set: { isDefault: false } }
        );
      }

      const address = {
        userId: req.userId,
        ...validated,
        isDefault,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await addressesCollection.insertOne(address);
      const addressId = result.insertedId.toString();

      res.status(201).json({
        ok: true,
        data: {
          _id: addressId,
          ...address,
        },
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

      console.error('Error creating address:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to create address',
      });
    }
  }

  /**
   * PUT /api/addresses/:id
   * Update an address
   */
  static async updateAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const addressSchema = z.object({
        name: z.string().min(1).optional(),
        street: z.string().min(1).optional(),
        city: z.string().min(1).optional(),
        state: z.string().min(1).optional(),
        pincode: z.string().min(1).optional(),
        country: z.string().min(1).optional(),
        phone: z.string().optional(),
      });

      const validated = addressSchema.parse(req.body);
      const addressId = req.params.id;

      const db = mongo.getDb();
      const addressesCollection = db.collection('addresses');

      // Verify address belongs to user
      const address = await addressesCollection.findOne({
        _id: new ObjectId(addressId),
        userId: req.userId,
      });

      if (!address) {
        res.status(404).json({ ok: false, error: 'Address not found' });
        return;
      }

      await addressesCollection.updateOne(
        { _id: new ObjectId(addressId) },
        {
          $set: {
            ...validated,
            updatedAt: new Date(),
          },
        }
      );

      res.json({
        ok: true,
        message: 'Address updated successfully',
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

      console.error('Error updating address:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update address',
      });
    }
  }

  /**
   * DELETE /api/addresses/:id
   * Delete an address
   */
  static async deleteAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const addressId = req.params.id;
      const db = mongo.getDb();
      const addressesCollection = db.collection('addresses');

      // Verify address belongs to user
      const address = await addressesCollection.findOne({
        _id: new ObjectId(addressId),
        userId: req.userId,
      });

      if (!address) {
        res.status(404).json({ ok: false, error: 'Address not found' });
        return;
      }

      await addressesCollection.deleteOne({ _id: new ObjectId(addressId) });

      res.json({
        ok: true,
        message: 'Address deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting address:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to delete address',
      });
    }
  }

  /**
   * POST /api/addresses/:id/set-default
   * Set an address as default
   */
  static async setDefaultAddress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const addressId = req.params.id;
      const db = mongo.getDb();
      const addressesCollection = db.collection('addresses');

      // Verify address belongs to user
      const address = await addressesCollection.findOne({
        _id: new ObjectId(addressId),
        userId: req.userId,
      });

      if (!address) {
        res.status(404).json({ ok: false, error: 'Address not found' });
        return;
      }

      // Unset all other defaults
      await addressesCollection.updateMany(
        { userId: req.userId },
        { $set: { isDefault: false } }
      );

      // Set this address as default
      await addressesCollection.updateOne(
        { _id: new ObjectId(addressId) },
        { $set: { isDefault: true, updatedAt: new Date() } }
      );

      res.json({
        ok: true,
        message: 'Default address updated successfully',
      });
    } catch (error) {
      console.error('Error setting default address:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to set default address',
      });
    }
  }

  /**
   * PUT /api/me
   * Update user profile (firstName, lastName, phone)
   */
  static async updateMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const updateSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional(),
      });

      const validated = updateSchema.parse(req.body);

      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');

      // Update user
      await usersCollection.updateOne(
        { _id: new ObjectId(req.userId) } as any,
        {
          $set: {
            ...validated,
            updatedAt: new Date(),
          },
        }
      );

      // Get updated user
      const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) } as any);

      if (!user) {
        res.status(404).json({ ok: false, error: 'User not found' });
        return;
      }

      res.json({
        ok: true,
        data: {
          user: {
            id: user._id?.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
          },
        },
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

      console.error('Error updating profile:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update profile',
      });
    }
  }

  /**
   * POST /api/me/email-change
   * Request email change (sends verification email to new address)
   */
  static async requestEmailChange(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const emailSchema = z.object({
        email: z.string().email('Invalid email address'),
      });

      const validated = emailSchema.parse(req.body);
      const newEmail = validated.email.toLowerCase().trim();

      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');

      // Get current user
      const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) } as any);

      if (!user) {
        res.status(404).json({ ok: false, error: 'User not found' });
        return;
      }

      // Check if email is the same
      if (user.email === newEmail) {
        res.status(400).json({
          ok: false,
          error: 'New email must be different from current email',
        });
        return;
      }

      // Check if new email is already in use
      const existingUser = await usersCollection.findOne({ email: newEmail });
      if (existingUser) {
        res.status(400).json({
          ok: false,
          error: 'This email is already in use',
        });
        return;
      }

      // Generate email change token
      const crypto = require('crypto');
      const changeToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(changeToken).digest('hex');

      // Set token expiry (24 hours)
      const changeExpires = new Date();
      changeExpires.setHours(changeExpires.getHours() + 24);

      // Store pending email and token
      await usersCollection.updateOne(
        { _id: new ObjectId(req.userId) } as any,
        {
          $set: {
            pendingEmail: newEmail,
            emailChangeToken: hashedToken,
            emailChangeExpires: changeExpires,
            updatedAt: new Date(),
          },
        }
      );

      // Generate verification link
      const Config = require('../config/Config').Config;
      const frontendUrl = Config.get('FRONTEND_URL', 'http://localhost:5173');
      const verificationLink = `${frontendUrl}/verify-email-change?token=${changeToken}`;

      // Send verification email to new address
      const { emailTriggerService } = require('../services/EmailTriggerService');
      const { EmailEventType } = require('../models/EmailTemplate');
      const { storeSettingsService } = require('../services/StoreSettingsService');

      // Get store name from store settings, fallback to store.name, then default
      let siteName = Config.get('STORE_NAME', 'Handmade Harmony');
      try {
        siteName = await storeSettingsService.getStoreName();
      } catch (error) {
        console.warn('Failed to load store name from settings:', error);
      }

      await emailTriggerService.sendTemplateEmail(
        EmailEventType.EMAIL_VERIFICATION,
        newEmail,
        {
          userName: user.firstName || user.email,
          verificationLink,
          siteName,
        },
        {
          isImportant: true,
          skipPreferences: true,
        }
      );

      res.json({
        ok: true,
        message: 'Verification email sent. Please check your new email inbox.',
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

      console.error('Error requesting email change:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to request email change',
      });
    }
  }

  /**
   * POST /api/me/change-password
   * Change user password (requires current password)
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const changePasswordSchema = z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(1, 'New password is required'),
      });

      const validated = changePasswordSchema.parse(req.body);

      const db = mongo.getDb();
      const usersCollection = db.collection<User>('users');

      // Get current user
      const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) } as any);
      if (!user) {
        res.status(404).json({ ok: false, error: 'User not found' });
        return;
      }

      // Check if user has a password (Google OAuth users might not have one set)
      if (!user.password || user.password.trim() === '') {
        res.status(400).json({
          ok: false,
          error: 'No password set for this account. Please use password reset to set a password first.',
        });
        return;
      }

      // Verify current password
      let isCurrentPasswordValid = false;
      try {
        // Trim the input password to handle any whitespace issues
        const trimmedPassword = validated.currentPassword.trim();
        isCurrentPasswordValid = await argon2.verify(user.password, trimmedPassword);
      } catch (error) {
        console.error('Error verifying current password:', error);
        // If verification throws an error (e.g., malformed hash), treat as invalid
        res.status(400).json({
          ok: false,
          error: 'Current password is incorrect',
        });
        return;
      }

      if (!isCurrentPasswordValid) {
        res.status(400).json({
          ok: false,
          error: 'Current password is incorrect',
        });
        return;
      }

      // Check if new password is different from current password
      const isSamePassword = await argon2.verify(user.password, validated.newPassword);
      if (isSamePassword) {
        res.status(400).json({
          ok: false,
          error: 'New password must be different from current password',
        });
        return;
      }

      // Validate new password against policy
      const passwordValidation = validatePassword(validated.newPassword);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          ok: false,
          error: 'Password validation failed',
          details: passwordValidation.errors.map(error => ({ message: error })),
        });
        return;
      }

      // Hash new password
      const hashedPassword = await argon2.hash(validated.newPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      // Update password
      await usersCollection.updateOne(
        { _id: new ObjectId(req.userId) } as any,
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        }
      );

      // Revoke all other sessions (security best practice - force re-login on other devices)
      const sessionsCollection = db.collection('sessions');
      const currentSessionToken = req.sessionId; // This is the session token, not ObjectId
      if (currentSessionToken) {
        // Exclude current session by token (not _id)
        await sessionsCollection.deleteMany({
          userId: req.userId,
          token: { $ne: currentSessionToken },
        });
      } else {
        // If no session token, revoke all sessions
        await sessionsCollection.deleteMany({ userId: req.userId });
      }

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
      ).catch(err => {
        console.error('Failed to send password changed email:', err);
      });

      // Log audit event
      const auditLogsCollection = db.collection<AuditLog>('audit_logs');
      await auditLogsCollection.insertOne({
        actorId: req.userId,
        actorType: 'user',
        action: 'auth.password.changed',
        objectType: 'user',
        objectId: req.userId,
        metadata: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        createdAt: new Date(),
      }).catch(err => {
        console.error('Failed to log audit event:', err);
      });

      res.json({
        ok: true,
        message: 'Password changed successfully',
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

      console.error('Error changing password:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to change password',
      });
    }
  }
}


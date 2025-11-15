/**
 * User Controller
 * 
 * Handles user account operations including email preferences.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { User } from '../types';

const updateEmailPreferencesSchema = z.object({
  marketing: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  transactional: z.boolean().optional(),
}).passthrough(); // Allow additional event types

export class UserController {
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
}


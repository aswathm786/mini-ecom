/**
 * Secret Controller
 * 
 * Handles environment variables and secrets management.
 * Only allows managing non-critical secrets (payment, shipping, AI keys, etc.)
 * Critical secrets like DB URLs, JWT secrets are excluded for security.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';

// List of environment variables that should NOT be manageable through UI
// These are critical for system operation and should only be set in .env file
const EXCLUDED_ENV_VARS = [
  'MONGODB_URI',
  'MONGO_URI',
  'JWT_SECRET',
  'SESSION_SECRET',
  'CSRF_SECRET',
  'NODE_ENV',
  'PORT',
  'APP_URL',
  'API_URL',
  'CORS_ORIGIN',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'MONGO_ROOT_USERNAME',
  'MONGO_ROOT_PASSWORD',
];

interface Secret {
  _id?: string;
  key: string;
  value: string;
  description?: string;
  isSecret: boolean;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const createSecretSchema = z.object({
  key: z.string().min(1, 'Key is required').regex(/^[A-Z0-9_]+$/, 'Key must be uppercase letters, numbers, and underscores only'),
  value: z.string().min(1, 'Value is required'),
  description: z.string().optional(),
  isSecret: z.boolean().optional().default(true),
  category: z.string().optional(),
});

const updateSecretSchema = z.object({
  value: z.string().min(1).optional(),
  description: z.string().optional(),
  isSecret: z.boolean().optional(),
  category: z.string().optional(),
});

export class SecretController {
  /**
   * GET /api/admin/secrets
   * List all secrets
   */
  static async listSecrets(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const secretsCollection = db.collection<Secret>('secrets');

      const secrets = await secretsCollection.find({}).sort({ category: 1, key: 1 }).toArray();

      res.json({
        ok: true,
        data: secrets.map(s => ({
          _id: s._id?.toString(),
          key: s.key,
          value: s.value,
          description: s.description,
          isSecret: s.isSecret !== false,
          category: s.category || 'Other',
        })),
      });
    } catch (error) {
      console.error('Error listing secrets:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch secrets',
      });
    }
  }

  /**
   * POST /api/admin/secrets
   * Create a new secret
   */
  static async createSecret(req: Request, res: Response): Promise<void> {
    try {
      const validated = createSecretSchema.parse(req.body);

      // Check if key is in excluded list (critical system variables)
      if (EXCLUDED_ENV_VARS.includes(validated.key)) {
        res.status(400).json({
          ok: false,
          error: `Cannot manage "${validated.key}" through UI. This is a critical system variable and must be set in the .env file.`,
        });
        return;
      }

      const db = mongo.getDb();
      const secretsCollection = db.collection<Secret>('secrets');

      // Check if key already exists
      const existing = await secretsCollection.findOne({ key: validated.key });
      if (existing) {
        res.status(400).json({
          ok: false,
          error: 'Secret with this key already exists',
        });
        return;
      }

      const secret: Secret = {
        key: validated.key,
        value: validated.value,
        description: validated.description,
        isSecret: validated.isSecret !== false,
        category: validated.category || 'Other',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await secretsCollection.insertOne(secret);

      res.status(201).json({
        ok: true,
        data: {
          _id: result.insertedId.toString(),
          ...secret,
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

      console.error('Error creating secret:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to create secret',
      });
    }
  }

  /**
   * PUT /api/admin/secrets/:id
   * Update a secret
   */
  static async updateSecret(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateSecretSchema.parse(req.body);

      const db = mongo.getDb();
      const secretsCollection = db.collection<Secret>('secrets');

      const secret = await secretsCollection.findOne({ _id: new ObjectId(id) });
      if (!secret) {
        res.status(404).json({
          ok: false,
          error: 'Secret not found',
        });
        return;
      }

      const updateData: Partial<Secret> = {
        updatedAt: new Date(),
      };

      if (validated.value !== undefined) updateData.value = validated.value;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.isSecret !== undefined) updateData.isSecret = validated.isSecret;
      if (validated.category !== undefined) updateData.category = validated.category;

      await secretsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      const updated = await secretsCollection.findOne({ _id: new ObjectId(id) });

      res.json({
        ok: true,
        data: {
          _id: updated?._id?.toString(),
          key: updated?.key,
          value: updated?.value,
          description: updated?.description,
          isSecret: updated?.isSecret !== false,
          category: updated?.category || 'Other',
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

      console.error('Error updating secret:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update secret',
      });
    }
  }

  /**
   * DELETE /api/admin/secrets/:id
   * Delete a secret
   */
  static async deleteSecret(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const db = mongo.getDb();
      const secretsCollection = db.collection<Secret>('secrets');

      const secret = await secretsCollection.findOne({ _id: new ObjectId(id) });
      if (!secret) {
        res.status(404).json({
          ok: false,
          error: 'Secret not found',
        });
        return;
      }

      await secretsCollection.deleteOne({ _id: new ObjectId(id) });

      res.json({
        ok: true,
        message: 'Secret deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting secret:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to delete secret',
      });
    }
  }
}


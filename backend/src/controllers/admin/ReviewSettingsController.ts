/**
 * Review Settings Controller
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';

const updateReviewSchema = z.object({
  enabled: z.boolean().optional(),
  requireModeration: z.boolean().optional(),
});

export class ReviewSettingsController {
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      const reviews = flags.reviews || {};
      
      res.json({
        ok: true,
        data: reviews,
      });
    } catch (error) {
      console.error('Error getting review settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get review settings',
      });
    }
  }

  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateReviewSchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.reviews || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      const updated = {
        ...current,
        ...(validated.enabled !== undefined ? { enabled: validated.enabled } : {}),
        ...(validated.requireModeration !== undefined ? { requireModeration: validated.requireModeration } : {}),
      };

      await settingsService.updateFeatureFlags({
        reviews: updated,
      }, adminId);

      await adminAuditService.logSettingsChange(
        'reviews',
        oldValue,
        updated,
        adminId,
        req,
      );

      res.json({
        ok: true,
        data: updated,
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

      console.error('Error updating review settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update review settings',
      });
    }
  }
}


/**
 * Notification Settings Controller
 * 
 * Manages web push notification toggles
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';

const updateNotificationSchema = z.object({
  webpush: z.object({ enabled: z.boolean() }).optional(),
});

export class NotificationSettingsController {
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      const notifications = flags.notifications || {};
      
      res.json({
        ok: true,
        data: notifications,
      });
    } catch (error) {
      console.error('Error getting notification settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get notification settings',
      });
    }
  }

  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateNotificationSchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.notifications || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      const updated = {
        ...current,
        ...validated,
      };

      await settingsService.updateFeatureFlags({
        notifications: updated,
      }, adminId);

      await adminAuditService.logSettingsChange(
        'notifications',
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

      console.error('Error updating notification settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update notification settings',
      });
    }
  }
}


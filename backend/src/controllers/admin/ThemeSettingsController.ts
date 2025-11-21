/**
 * Theme Settings Controller
 * 
 * Manages theme system enable/disable and scheduling
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';

const updateThemeSchema = z.object({
  enabled: z.boolean().optional(),
});

export class ThemeSettingsController {
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      const theme = flags.theme || {};
      
      res.json({
        ok: true,
        data: theme,
      });
    } catch (error) {
      console.error('Error getting theme settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get theme settings',
      });
    }
  }

  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateThemeSchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.theme || {};
      const oldValue = current.enabled;

      const updated = {
        ...current,
        ...(validated.enabled !== undefined ? { enabled: validated.enabled } : {}),
      };

      await settingsService.updateFeatureFlags({
        theme: updated,
      }, adminId);

      await adminAuditService.logFeatureToggle(
        'theme.enabled',
        oldValue,
        updated.enabled,
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

      console.error('Error updating theme settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update theme settings',
      });
    }
  }
}


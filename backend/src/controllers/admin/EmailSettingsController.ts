/**
 * Email Settings Controller
 * 
 * Manages email automation toggles
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';

const updateEmailSchema = z.object({
  enabled: z.boolean().optional(),
  marketing: z.object({ enabled: z.boolean() }).optional(),
  transactional: z.object({ enabled: z.boolean() }).optional(),
  productLaunch: z.object({ enabled: z.boolean() }).optional(),
  announcements: z.object({ enabled: z.boolean() }).optional(),
});

export class EmailSettingsController {
  /**
   * GET /api/admin/settings/email
   * Get email settings
   */
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      const email = flags.email || {};
      
      res.json({
        ok: true,
        data: email,
      });
    } catch (error) {
      console.error('Error getting email settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get email settings',
      });
    }
  }

  /**
   * PATCH /api/admin/settings/email
   * Update email settings
   */
  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateEmailSchema.parse(req.body);
      const adminId = req.userId!;

      // Get current settings
      const flags = await settingsService.getFeatureFlags();
      const current = flags.email || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      // Update settings
      const updated = {
        ...current,
        ...(validated.enabled !== undefined ? { enabled: validated.enabled } : {}),
        ...(validated.marketing ? { marketing: validated.marketing } : {}),
        ...(validated.transactional ? { transactional: validated.transactional } : {}),
        ...(validated.productLaunch ? { productLaunch: validated.productLaunch } : {}),
        ...(validated.announcements ? { announcements: validated.announcements } : {}),
      };

      // Ensure transactional is always enabled (cannot be disabled)
      if (updated.transactional) {
        updated.transactional.enabled = true;
      } else {
        updated.transactional = { enabled: true };
      }

      // Update feature flags
      await settingsService.updateFeatureFlags({
        email: updated,
      }, adminId);

      // Log audit
      await adminAuditService.logSettingsChange(
        'email',
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

      console.error('Error updating email settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update email settings',
      });
    }
  }
}


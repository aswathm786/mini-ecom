/**
 * Tools Settings Controller
 * 
 * Manages bulk import/export toggles
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';

const updateToolsSchema = z.object({
  bulkImport: z.object({ enabled: z.boolean() }).optional(),
});

export class ToolsSettingsController {
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      const tools = flags.tools || {};
      
      res.json({
        ok: true,
        data: tools,
      });
    } catch (error) {
      console.error('Error getting tools settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get tools settings',
      });
    }
  }

  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateToolsSchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.tools || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      const updated = {
        ...current,
        ...validated,
      };

      await settingsService.updateFeatureFlags({
        tools: updated,
      }, adminId);

      await adminAuditService.logSettingsChange(
        'tools',
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

      console.error('Error updating tools settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update tools settings',
      });
    }
  }
}


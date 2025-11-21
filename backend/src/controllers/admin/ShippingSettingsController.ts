/**
 * Shipping Settings Controller
 * 
 * Manages shipping provider toggles (Delhivery, BlueDart, DTDC)
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';

const updateProviderSchema = z.object({
  provider: z.enum(['delhivery', 'bluedart', 'dtdc']),
  enabled: z.boolean(),
  config: z.record(z.any()).optional(),
});

export class ShippingSettingsController {
  /**
   * GET /api/admin/settings/shipping
   * Get shipping provider settings
   */
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const shipping = await settingsService.getSetting('shipping') || {};
      
      res.json({
        ok: true,
        data: shipping,
      });
    } catch (error) {
      console.error('Error getting shipping settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get shipping settings',
      });
    }
  }

  /**
   * PATCH /api/admin/settings/shipping
   * Update shipping provider settings
   */
  static async updateProvider(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateProviderSchema.parse(req.body);
      const adminId = req.userId!;

      // Get current settings
      const current = await settingsService.getSetting('shipping') || {};
      const providers = current.providers || {};
      const currentProvider = providers[validated.provider] || { enabled: false };
      const oldValue = currentProvider.enabled;

      // Update provider
      providers[validated.provider] = {
        enabled: validated.enabled,
        config: validated.config || currentProvider.config || {},
        ...(validated.enabled && !oldValue ? { enabledAt: new Date() } : {}),
        ...(!validated.enabled && oldValue ? { disabledAt: new Date() } : {}),
      };

      // Save settings
      await settingsService.updateAppSettings('shipping', {
        providers,
      }, adminId);

      // Log audit
      await adminAuditService.logFeatureToggle(
        `shipping.${validated.provider}`,
        oldValue,
        validated.enabled,
        adminId,
        req,
      );

      res.json({
        ok: true,
        data: {
          provider: validated.provider,
          enabled: validated.enabled,
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

      console.error('Error updating shipping provider:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update shipping provider',
      });
    }
  }
}


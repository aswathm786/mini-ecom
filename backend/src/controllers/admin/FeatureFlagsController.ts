/**
 * Feature Flags Controller
 * 
 * Centralized feature flag management
 */

import { Request, Response } from 'express';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';
import { FeatureFlags } from '../../models/settings.model';

export class FeatureFlagsController {
  /**
   * GET /api/admin/feature-flags
   * Get all feature flags
   */
  static async getFlags(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags(true);
      
      res.json({
        ok: true,
        data: flags,
      });
    } catch (error) {
      console.error('Error getting feature flags:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get feature flags',
      });
    }
  }

  /**
   * PATCH /api/admin/feature-flags
   * Update feature flags (single or bulk)
   */
  static async updateFlags(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body as Partial<FeatureFlags>;
      const adminId = req.userId!;

      // Get current flags
      const current = await settingsService.getFeatureFlags(true);
      const oldValue = JSON.parse(JSON.stringify(current));

      // Update flags
      const updated = await settingsService.updateFeatureFlags(updates, adminId);

      // Log audit for each changed feature
      for (const key in updates) {
        const old = oldValue[key];
        const newVal = updated[key];
        if (JSON.stringify(old) !== JSON.stringify(newVal)) {
          await adminAuditService.logFeatureToggle(
            key,
            old,
            newVal,
            adminId,
            req,
          );
        }
      }

      res.json({
        ok: true,
        data: updated,
      });
    } catch (error) {
      console.error('Error updating feature flags:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update feature flags',
      });
    }
  }

  /**
   * GET /api/feature-flags
   * Get public-safe feature flags (for frontend)
   */
  static async getPublicFlags(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      
      // Return only safe flags (no sensitive config)
      const publicFlags: any = {};
      
      // Include feature toggles but not sensitive config
      if (flags.checkout) publicFlags.checkout = { guestEnabled: flags.checkout.guestEnabled };
      if (flags.wishlist) publicFlags.wishlist = flags.wishlist;
      if (flags.reviews) publicFlags.reviews = { enabled: flags.reviews.enabled };
      if (flags.coupons) publicFlags.coupons = { enabled: flags.coupons.enabled };
      if (flags.loyalty) publicFlags.loyalty = { enabled: flags.loyalty.enabled };
      if (flags.returns) publicFlags.returns = { enabled: flags.returns.enabled };
      if (flags.notifications) publicFlags.notifications = flags.notifications;
      if (flags.ai) publicFlags.ai = { chat: flags.ai.chat };
      
      res.json({
        ok: true,
        data: publicFlags,
      });
    } catch (error) {
      console.error('Error getting public feature flags:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get feature flags',
      });
    }
  }
}


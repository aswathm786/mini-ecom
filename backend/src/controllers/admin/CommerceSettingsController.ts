/**
 * Commerce Settings Controller
 * 
 * Manages wishlist, coupons, loyalty, guest checkout, returns toggles
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';

const updateCouponSchema = z.object({
  enabled: z.boolean().optional(),
  types: z.object({
    percent: z.boolean().optional(),
    flat: z.boolean().optional(),
    bxgy: z.boolean().optional(),
    firstOrder: z.boolean().optional(),
  }).optional(),
});

const updateLoyaltySchema = z.object({
  enabled: z.boolean().optional(),
  rules: z.object({
    pointsPerRupee: z.number().optional(),
    redemptionRate: z.number().optional(),
    minRedeemPoints: z.number().optional(),
    maxRedeemPercentage: z.number().optional(),
  }).optional(),
});

const updateReturnsSchema = z.object({
  enabled: z.boolean().optional(),
  windowDays: z.number().optional(),
  autoApprove: z.boolean().optional(),
});

export class CommerceSettingsController {
  static async updateWishlist(req: Request, res: Response): Promise<void> {
    try {
      const { enabled } = req.body;
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.wishlist || {};
      const oldValue = current.enabled;

      await settingsService.updateFeatureFlags({
        wishlist: {
          enabled: enabled !== false,
        },
      }, adminId);

      await adminAuditService.logFeatureToggle(
        'wishlist',
        oldValue,
        enabled,
        adminId,
        req,
      );

      res.json({
        ok: true,
        data: { enabled: enabled !== false },
      });
    } catch (error) {
      console.error('Error updating wishlist:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update wishlist settings',
      });
    }
  }

  static async updateCoupons(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateCouponSchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.coupons || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      const updated = {
        ...current,
        ...(validated.enabled !== undefined ? { enabled: validated.enabled } : {}),
        ...(validated.types ? { types: { ...current.types, ...validated.types } } : {}),
      };

      await settingsService.updateFeatureFlags({
        coupons: updated,
      }, adminId);

      await adminAuditService.logSettingsChange(
        'coupons',
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

      console.error('Error updating coupons:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update coupon settings',
      });
    }
  }

  static async updateLoyalty(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateLoyaltySchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.loyalty || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      const updated = {
        ...current,
        ...(validated.enabled !== undefined ? { enabled: validated.enabled } : {}),
        ...(validated.rules ? { rules: { ...current.rules, ...validated.rules } } : {}),
      };

      await settingsService.updateFeatureFlags({
        loyalty: updated,
      }, adminId);

      await adminAuditService.logSettingsChange(
        'loyalty',
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

      console.error('Error updating loyalty:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update loyalty settings',
      });
    }
  }

  static async updateGuestCheckout(req: Request, res: Response): Promise<void> {
    try {
      const { enabled } = req.body;
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.checkout || {};
      const oldValue = current.guestEnabled;

      await settingsService.updateFeatureFlags({
        checkout: {
          ...current,
          guestEnabled: enabled !== false,
        },
      }, adminId);

      await adminAuditService.logFeatureToggle(
        'checkout.guestEnabled',
        oldValue,
        enabled,
        adminId,
        req,
      );

      res.json({
        ok: true,
        data: { guestEnabled: enabled !== false },
      });
    } catch (error) {
      console.error('Error updating guest checkout:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update guest checkout settings',
      });
    }
  }

  static async updateReturns(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateReturnsSchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.returns || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      const updated = {
        ...current,
        ...validated,
      };

      await settingsService.updateFeatureFlags({
        returns: updated,
      }, adminId);

      await adminAuditService.logSettingsChange(
        'returns',
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

      console.error('Error updating returns:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update returns settings',
      });
    }
  }
}


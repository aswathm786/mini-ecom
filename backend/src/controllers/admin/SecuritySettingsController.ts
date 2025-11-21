/**
 * Security Settings Controller
 * 
 * Manages security-related toggles (2FA, IP whitelist, fraud detection)
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';

const update2FASchema = z.object({
  requireForAdmin: z.boolean().optional(),
  allowForUsers: z.boolean().optional(),
});

const updateIpWhitelistSchema = z.object({
  enabled: z.boolean(),
  ips: z.array(z.string()).optional(),
});

const updateFraudSchema = z.object({
  enabled: z.boolean(),
  rules: z.object({
    orderVelocity: z.number().optional(),
    bannedEmails: z.array(z.string()).optional(),
  }).optional(),
});

export class SecuritySettingsController {
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      const security = flags.security || {};
      
      res.json({
        ok: true,
        data: security,
      });
    } catch (error) {
      console.error('Error getting security settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get security settings',
      });
    }
  }

  static async update2FA(req: Request, res: Response): Promise<void> {
    try {
      const validated = update2FASchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.security?.['2fa'] || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      const updated = {
        ...current,
        ...validated,
      };

      await settingsService.updateFeatureFlags({
        security: {
          ...flags.security,
          '2fa': updated,
        },
      }, adminId);

      await adminAuditService.logSettingsChange(
        'security.2fa',
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

      console.error('Error updating 2FA settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update 2FA settings',
      });
    }
  }

  static async updateIpWhitelist(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateIpWhitelistSchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.security?.adminIpWhitelist || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      const updated = {
        enabled: validated.enabled,
        ips: validated.ips || current.ips || [],
      };

      await settingsService.updateFeatureFlags({
        security: {
          ...flags.security,
          adminIpWhitelist: updated,
        },
      }, adminId);

      await adminAuditService.logSettingsChange(
        'security.adminIpWhitelist',
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

      console.error('Error updating IP whitelist:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update IP whitelist',
      });
    }
  }

  static async updateFraudDetection(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateFraudSchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.security?.fraud || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      const updated = {
        enabled: validated.enabled,
        rules: validated.rules || current.rules || {},
      };

      await settingsService.updateFeatureFlags({
        security: {
          ...flags.security,
          fraud: updated,
        },
      }, adminId);

      await adminAuditService.logSettingsChange(
        'security.fraud',
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

      console.error('Error updating fraud detection:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update fraud detection',
      });
    }
  }
}


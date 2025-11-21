/**
 * Infrastructure Settings Controller
 * 
 * Manages maintenance mode, CDN, backups, monitoring, privacy
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';

const updateMaintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().optional(),
  whitelistIps: z.array(z.string()).optional(),
});

const updateCDNSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().optional(),
  config: z.record(z.any()).optional(),
});

const updateBackupSchema = z.object({
  enabled: z.boolean(),
  retentionDays: z.number().optional(),
});

const updateMonitoringSchema = z.object({
  enabled: z.boolean(),
  prometheus: z.object({ enabled: z.boolean() }).optional(),
});

const updatePrivacySchema = z.object({
  export: z.object({ enabled: z.boolean() }).optional(),
  deletion: z.object({ enabled: z.boolean() }).optional(),
});

export class InfrastructureSettingsController {
  static async getMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const site = await settingsService.getSetting('site') || {};
      res.json({
        ok: true,
        data: site.maintenance || { enabled: false },
      });
    } catch (error) {
      console.error('Error getting maintenance settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get maintenance settings',
      });
    }
  }

  static async updateMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateMaintenanceSchema.parse(req.body);
      const adminId = req.userId!;

      const site = await settingsService.getSetting('site') || {};
      const oldValue = JSON.parse(JSON.stringify(site.maintenance || {}));

      await settingsService.updateAppSettings('site', {
        ...site,
        maintenance: validated,
      }, adminId);

      await adminAuditService.logSettingsChange(
        'site.maintenance',
        oldValue,
        validated,
        adminId,
        req,
      );

      res.json({
        ok: true,
        data: validated,
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

      console.error('Error updating maintenance:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update maintenance settings',
      });
    }
  }

  static async getCDN(req: Request, res: Response): Promise<void> {
    try {
      const cdn = await settingsService.getSetting('cdn') || { enabled: false };
      res.json({
        ok: true,
        data: cdn,
      });
    } catch (error) {
      console.error('Error getting CDN settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get CDN settings',
      });
    }
  }

  static async updateCDN(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateCDNSchema.parse(req.body);
      const adminId = req.userId!;

      const oldValue = await settingsService.getSetting('cdn') || { enabled: false };

      await settingsService.updateAppSettings('cdn', validated, adminId);

      await adminAuditService.logSettingsChange(
        'cdn',
        oldValue,
        validated,
        adminId,
        req,
      );

      res.json({
        ok: true,
        data: validated,
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

      console.error('Error updating CDN:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update CDN settings',
      });
    }
  }

  static async purgeCDN(req: Request, res: Response): Promise<void> {
    try {
      // This is a placeholder - implement actual CDN purge logic
      const cdn = await settingsService.getSetting('cdn');
      if (!cdn?.enabled) {
        res.status(400).json({
          ok: false,
          error: 'CDN is not enabled',
        });
        return;
      }

      // TODO: Implement actual CDN purge
      // await cdnService.purgeCache();

      await adminAuditService.log({
        action: 'cdn_purge',
        adminId: req.userId!,
        metadata: {
          type: 'cdn',
        },
      }, req);

      res.json({
        ok: true,
        message: 'CDN cache purge initiated',
      });
    } catch (error) {
      console.error('Error purging CDN:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to purge CDN cache',
      });
    }
  }

  static async getBackups(req: Request, res: Response): Promise<void> {
    try {
      const backups = await settingsService.getSetting('backups') || { enabled: false };
      res.json({
        ok: true,
        data: backups,
      });
    } catch (error) {
      console.error('Error getting backup settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get backup settings',
      });
    }
  }

  static async updateBackups(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateBackupSchema.parse(req.body);
      const adminId = req.userId!;

      const oldValue = await settingsService.getSetting('backups') || { enabled: false };

      await settingsService.updateAppSettings('backups', validated, adminId);

      await adminAuditService.logSettingsChange(
        'backups',
        oldValue,
        validated,
        adminId,
        req,
      );

      res.json({
        ok: true,
        data: validated,
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

      console.error('Error updating backup settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update backup settings',
      });
    }
  }

  static async triggerBackup(req: Request, res: Response): Promise<void> {
    try {
      const backups = await settingsService.getSetting('backups');
      if (!backups?.enabled) {
        res.status(400).json({
          ok: false,
          error: 'Backups are not enabled',
        });
        return;
      }

      // TODO: Trigger actual backup script
      // await backupService.runBackup();

      await adminAuditService.log({
        action: 'backup_trigger',
        adminId: req.userId!,
        metadata: {
          type: 'backup',
          manual: true,
        },
      }, req);

      res.json({
        ok: true,
        message: 'Backup initiated',
      });
    } catch (error) {
      console.error('Error triggering backup:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to trigger backup',
      });
    }
  }

  static async getMonitoring(req: Request, res: Response): Promise<void> {
    try {
      const monitoring = await settingsService.getSetting('monitoring') || { enabled: false };
      res.json({
        ok: true,
        data: monitoring,
      });
    } catch (error) {
      console.error('Error getting monitoring settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get monitoring settings',
      });
    }
  }

  static async updateMonitoring(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateMonitoringSchema.parse(req.body);
      const adminId = req.userId!;

      const oldValue = await settingsService.getSetting('monitoring') || { enabled: false };

      await settingsService.updateAppSettings('monitoring', validated, adminId);

      await adminAuditService.logSettingsChange(
        'monitoring',
        oldValue,
        validated,
        adminId,
        req,
      );

      res.json({
        ok: true,
        data: validated,
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

      console.error('Error updating monitoring:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update monitoring settings',
      });
    }
  }

  static async getPrivacy(req: Request, res: Response): Promise<void> {
    try {
      const privacy = await settingsService.getSetting('privacy') || {};
      res.json({
        ok: true,
        data: privacy,
      });
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get privacy settings',
      });
    }
  }

  static async updatePrivacy(req: Request, res: Response): Promise<void> {
    try {
      const validated = updatePrivacySchema.parse(req.body);
      const adminId = req.userId!;

      const oldValue = await settingsService.getSetting('privacy') || {};

      const current = await settingsService.getSetting('privacy') || {};
      const updated = {
        ...current,
        ...validated,
      };

      await settingsService.updateAppSettings('privacy', updated, adminId);

      await adminAuditService.logSettingsChange(
        'privacy',
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

      console.error('Error updating privacy:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update privacy settings',
      });
    }
  }
}


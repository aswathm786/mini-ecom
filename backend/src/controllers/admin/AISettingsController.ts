/**
 * AI Settings Controller
 * 
 * Manages AI feature toggles (chat, search, recommendations, admin tools)
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';
import { aiService } from '../../services/ai.service';

const updateAISchema = z.object({
  admin: z.object({
    productDescription: z.object({ enabled: z.boolean() }).optional(),
    productFAQ: z.object({ enabled: z.boolean() }).optional(),
    emailGenerator: z.object({ enabled: z.boolean() }).optional(),
    supportReply: z.object({ enabled: z.boolean() }).optional(),
  }).optional(),
});

const updateSearchSchema = z.object({
  semantic: z.object({ enabled: z.boolean() }).optional(),
  autocomplete: z.object({ enabled: z.boolean() }).optional(),
  trending: z.object({ enabled: z.boolean() }).optional(),
});


export class AISettingsController {
  static async getAISettings(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      const ai = flags.ai || {};
      
      res.json({
        ok: true,
        data: ai,
      });
    } catch (error) {
      console.error('Error getting AI settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get AI settings',
      });
    }
  }

  static async updateAI(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateAISchema.parse(req.body);
      const adminId = req.userId!;

      // Check if AI is enabled globally
      const aiServiceSettings = await aiService.getSettings();
      if (!aiServiceSettings.enabled && validated.admin) {
        // Check if any admin tool is being enabled
        const isEnablingAnyTool = 
          (validated.admin.productDescription?.enabled === true) ||
          (validated.admin.productFAQ?.enabled === true) ||
          (validated.admin.emailGenerator?.enabled === true) ||
          (validated.admin.supportReply?.enabled === true);
        
        if (isEnablingAnyTool) {
          res.status(400).json({
            ok: false,
            error: 'AI must be enabled in Settings before enabling individual AI features',
          });
          return;
        }
      }

      const flags = await settingsService.getFeatureFlags();
      const current = flags.ai || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      // Build updated admin settings, only including defined values
      const updatedAdmin: any = { ...current.admin };
      if (validated.admin) {
        if (validated.admin.productDescription !== undefined) {
          updatedAdmin.productDescription = { enabled: validated.admin.productDescription.enabled };
        }
        if (validated.admin.productFAQ !== undefined) {
          updatedAdmin.productFAQ = { enabled: validated.admin.productFAQ.enabled };
        }
        if (validated.admin.emailGenerator !== undefined) {
          updatedAdmin.emailGenerator = { enabled: validated.admin.emailGenerator.enabled };
        }
        if (validated.admin.supportReply !== undefined) {
          updatedAdmin.supportReply = { enabled: validated.admin.supportReply.enabled };
        }
      }

      const updated = {
        ...current,
        ...(Object.keys(updatedAdmin).length > 0 ? { admin: updatedAdmin } : {}),
      };

      await settingsService.updateFeatureFlags({
        ai: updated,
      }, adminId);

      // Also update AI service settings to keep them in sync
      if (validated.admin) {
        const updatedAdminTools = {
          ...aiServiceSettings.adminTools,
          ...(validated.admin.productDescription !== undefined && {
            productDescription: validated.admin.productDescription.enabled,
          }),
          ...(validated.admin.productFAQ !== undefined && {
            productFAQ: validated.admin.productFAQ.enabled,
          }),
          ...(validated.admin.emailGenerator !== undefined && {
            emailGenerator: validated.admin.emailGenerator.enabled,
          }),
          ...(validated.admin.supportReply !== undefined && {
            supportReplies: validated.admin.supportReply.enabled,
          }),
        };
        await aiService.updateSettings({
          adminTools: updatedAdminTools,
        });
        // Force refresh the cache so changes take effect immediately
        await aiService.getSettings(true);
      }

      await adminAuditService.logSettingsChange(
        'ai',
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

      console.error('Error updating AI settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update AI settings',
      });
    }
  }

  static async getSearchSettings(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      const search = flags.search || {};
      
      res.json({
        ok: true,
        data: search,
      });
    } catch (error) {
      console.error('Error getting search settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get search settings',
      });
    }
  }

  static async updateSearch(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateSearchSchema.parse(req.body);
      const adminId = req.userId!;

      const flags = await settingsService.getFeatureFlags();
      const current = flags.search || {};
      const oldValue = JSON.parse(JSON.stringify(current));

      // Build updated search settings, only including defined values
      const updated: any = { ...current };
      if (validated.semantic !== undefined) {
        updated.semantic = { enabled: validated.semantic.enabled };
      }
      if (validated.autocomplete !== undefined) {
        updated.autocomplete = { enabled: validated.autocomplete.enabled };
      }
      if (validated.trending !== undefined) {
        updated.trending = { enabled: validated.trending.enabled };
      }

      await settingsService.updateFeatureFlags({
        search: updated,
      }, adminId);

      await adminAuditService.logSettingsChange(
        'search',
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

      console.error('Error updating search settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update search settings',
      });
    }
  }

}


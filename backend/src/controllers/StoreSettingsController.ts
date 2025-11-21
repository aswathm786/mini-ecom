/**
 * Store Settings Controller
 * 
 * Handles store branding settings (name, logo, favicon, contact info).
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { storeSettingsService } from '../services/StoreSettingsService';
import { mongo } from '../db/Mongo';
import { settingsService } from '../services/SettingsService';

const storeSettingsSchema = z.object({
  name: z.string().optional(),
  logo: z.union([
    z.string().url(),
    z.string().startsWith('/'),
    z.string().length(0),
    z.null(),
  ]).optional(),
  favicon: z.union([
    z.string().url(),
    z.string().startsWith('/'),
    z.string().length(0),
    z.null(),
  ]).optional(),
  tagline: z.string().optional(),
  link: z.union([
    z.string().url(),
    z.string().length(0),
    z.null(),
  ]).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  backendStoreName: z.string().optional(),
  invoicePrefix: z.string().optional(),
});

export class StoreSettingsController {
  /**
   * GET /api/store-settings
   * Get store settings (public endpoint)
   */
  static async getStoreSettings(req: Request, res: Response): Promise<void> {
    try {
      const storeSettings = await storeSettingsService.getStoreSettings();
      
      res.json({
        ok: true,
        data: storeSettings,
      });
    } catch (error) {
      console.error('Error getting store settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch store settings',
      });
    }
  }

  /**
   * GET /api/admin/store-settings
   * Get store settings (admin endpoint)
   */
  static async getAdminStoreSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const storeSettings = await storeSettingsService.getStoreSettings();
      
      res.json({
        ok: true,
        data: storeSettings,
      });
    } catch (error) {
      console.error('Error getting store settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch store settings',
      });
    }
  }

  /**
   * PUT /api/admin/store-settings
   * Update store settings
   */
  static async updateStoreSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const validated = storeSettingsSchema.parse(req.body);
      
      const updated = await storeSettingsService.updateStoreSettings(
        validated,
        req.userId
      );

      res.json({
        ok: true,
        data: updated,
        message: 'Store settings updated successfully',
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

      console.error('Error updating store settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update store settings',
      });
    }
  }

  /**
   * POST /api/admin/store-settings/upload-logo
   * Upload store logo
   */
  static async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const file = req.file;
      
      if (!file) {
        res.status(400).json({
          ok: false,
          error: 'No file uploaded',
        });
        return;
      }
      
      // Get file URL (assuming files are served at /api/uploads/:filename)
      const logoUrl = `/api/uploads/${file.filename}`;
      
      // Update store settings
      await storeSettingsService.updateStoreSettings(
        { logo: logoUrl },
        req.userId
      );
      
      res.json({
        ok: true,
        data: {
          logo: logoUrl,
        },
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to upload logo',
      });
    }
  }

  /**
   * POST /api/admin/store-settings/upload-favicon
   * Upload store favicon
   */
  static async uploadFavicon(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const file = req.file;
      
      if (!file) {
        res.status(400).json({
          ok: false,
          error: 'No file uploaded',
        });
        return;
      }
      
      // Get file URL (assuming files are served at /api/uploads/:filename)
      const faviconUrl = `/api/uploads/${file.filename}`;
      
      // Update store settings
      await storeSettingsService.updateStoreSettings(
        { favicon: faviconUrl },
        req.userId
      );
      
      res.json({
        ok: true,
        data: {
          favicon: faviconUrl,
        },
      });
    } catch (error) {
      console.error('Error uploading favicon:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to upload favicon',
      });
    }
  }
}


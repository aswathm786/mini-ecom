/**
 * Theme Settings Controller
 * 
 * Handles theme and design customization settings.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../services/SettingsService';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';

const themeSettingsSchema = z.object({
  // Color palette
  'theme.primary': z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  'theme.secondary': z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  'theme.accent': z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  'theme.background': z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  'theme.text': z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  'theme.textLight': z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  
  // Branding - allow null, empty string, or URL (including relative paths starting with /)
  'theme.logo': z.union([
    z.string().url(), 
    z.string().startsWith('/'), 
    z.string().length(0), 
    z.null()
  ]).optional(),
  'theme.favicon': z.union([
    z.string().url(), 
    z.string().startsWith('/'), 
    z.string().length(0), 
    z.null()
  ]).optional(),
  'theme.siteName': z.string().optional(),
  'theme.siteTagline': z.string().optional(),
  
  // Images - allow null, empty string, or URL (including relative paths starting with /)
  'theme.heroImage': z.union([
    z.string().url(), 
    z.string().startsWith('/'), 
    z.string().length(0), 
    z.null()
  ]).optional(),
  'theme.aboutImage': z.union([
    z.string().url(), 
    z.string().startsWith('/'), 
    z.string().length(0), 
    z.null()
  ]).optional(),
  'theme.footerImage': z.union([
    z.string().url(), 
    z.string().startsWith('/'), 
    z.string().length(0), 
    z.null()
  ]).optional(),
  
  // Layout
  'theme.headerStyle': z.enum(['default', 'centered', 'minimal']).optional(),
  'theme.footerStyle': z.enum(['default', 'minimal', 'extended']).optional(),
  'theme.layoutWidth': z.enum(['full', 'container', 'narrow']).optional(),
  
  // Typography
  'theme.fontFamily': z.string().optional(),
  'theme.headingFont': z.string().optional(),
  
  // Other design settings
  'theme.borderRadius': z.enum(['none', 'sm', 'md', 'lg', 'xl']).optional(),
  'theme.shadow': z.enum(['none', 'sm', 'md', 'lg']).optional(),
  'theme.animation': z.boolean().optional(),
});

export class ThemeSettingsController {
  /**
   * GET /api/admin/theme-settings
   * Get all theme settings
   */
  static async getThemeSettings(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const settingsCollection = db.collection('settings');
      
      // Get all theme-related settings
      const themeSettings = await settingsCollection
        .find({ key: { $regex: /^theme\./ } })
        .toArray();
      
      // Also get site.name and store.name for display purposes
      const siteNameSetting = await settingsCollection.findOne({ key: 'site.name' });
      const storeNameSetting = await settingsCollection.findOne({ key: 'store.name' });
      
      // Convert to object
      const settings: Record<string, any> = {};
      themeSettings.forEach(setting => {
        settings[setting.key] = setting.value;
      });
      
      // Include site.name if available (takes priority for display)
      if (siteNameSetting) {
        settings['site.name'] = siteNameSetting.value;
      }
      
      // Include store.name if available (fallback)
      if (storeNameSetting) {
        settings['store.name'] = storeNameSetting.value;
      }
      
      // Set defaults if not present
      const defaults = {
        'theme.primary': '#DC2626',
        'theme.secondary': '#1F2937',
        'theme.accent': '#F59E0B',
        'theme.background': '#FFFFFF',
        'theme.text': '#111827',
        'theme.textLight': '#6B7280',
        'theme.headerStyle': 'default',
        'theme.footerStyle': 'default',
        'theme.layoutWidth': 'container',
        'theme.borderRadius': 'md',
        'theme.shadow': 'md',
        'theme.animation': true,
      };
      
      const result = { ...defaults, ...settings };
      
      res.json({
        ok: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting theme settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch theme settings',
      });
    }
  }

  /**
   * PUT /api/admin/theme-settings
   * Update theme settings
   */
  static async updateThemeSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const validated = themeSettingsSchema.parse(req.body);
      
      const db = mongo.getDb();
      const settingsCollection = db.collection('settings');
      
      // Separate updates and deletions
      const updates: any[] = [];
      const deletions: string[] = [];
      
      Object.entries(validated).forEach(([key, value]) => {
        // If value is null, empty string, or undefined, delete the setting
        if (value === null || value === '' || value === undefined) {
          deletions.push(key);
        } else {
          updates.push({
            updateOne: {
              filter: { key },
              update: {
                $set: {
                  key,
                  value,
                  type: 'string',
                  description: `Theme setting: ${key}`,
                  updatedAt: new Date(),
                  updatedBy: req.userId,
                },
              },
              upsert: true,
            },
          });
        }
      });
      
      // Perform deletions
      if (deletions.length > 0) {
        await settingsCollection.deleteMany({ key: { $in: deletions } });
      }
      
      // Perform updates
      if (updates.length > 0) {
        await settingsCollection.bulkWrite(updates);
      }
      
      // Reload settings
      await settingsService.loadSettings();
      
      res.json({
        ok: true,
        message: 'Theme settings updated successfully',
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

  /**
   * POST /api/admin/theme-settings/upload-logo
   * Upload logo image
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
      
      // Save setting
      await settingsService.setSetting(
        'theme.logo',
        logoUrl,
        'string',
        'Store logo image URL'
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
   * POST /api/admin/theme-settings/upload-image
   * Upload theme image (hero, about, footer, etc.)
   */
  static async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      // Get imageType from req.body (multer parses form data fields)
      const imageType = req.body?.imageType || req.body?.imageType?.[0]; // Handle both string and array
      const file = req.file;
      
      console.log('Upload image - imageType:', imageType, 'file:', file?.filename);
      
      if (!file || !imageType) {
        res.status(400).json({
          ok: false,
          error: 'Missing file or image type',
          debug: { hasFile: !!file, imageType, body: req.body },
        });
        return;
      }
      
      const validTypes = ['heroImage', 'aboutImage', 'footerImage', 'favicon'];
      if (!validTypes.includes(imageType)) {
        res.status(400).json({
          ok: false,
          error: `Invalid image type: ${imageType}. Must be one of: ${validTypes.join(', ')}`,
        });
        return;
      }
      
      const imageUrl = `/api/uploads/${file.filename}`;
      const settingKey = `theme.${imageType}`;
      
      console.log('Saving image with key:', settingKey, 'URL:', imageUrl);
      
      await settingsService.setSetting(
        settingKey,
        imageUrl,
        'string',
        `Theme image: ${imageType}`
      );
      
      res.json({
        ok: true,
        data: {
          [imageType]: imageUrl,
        },
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to upload image',
      });
    }
  }
}


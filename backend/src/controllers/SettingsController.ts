/**
 * Public Settings Controller
 * 
 * Exposes public-safe settings endpoints for frontend
 */

import { Request, Response } from 'express';
import { settingsService } from '../services/SettingsService';
import { platformSettingsService } from '../services/PlatformSettingsService';

export class SettingsController {
  /**
   * GET /api/settings/shipping/available
   * Get available shipping providers
   */
  static async getAvailableShipping(req: Request, res: Response): Promise<void> {
    try {
      const shipping = await platformSettingsService.getSection('shipping');
      const providers = shipping.providers || {};
      
      const available = Object.keys(providers)
        .filter(key => providers[key]?.enabled)
        .map(key => ({
          provider: key,
          enabled: true,
        }));
      
      res.json({
        ok: true,
        data: available,
      });
    } catch (error) {
      console.error('Error getting available shipping:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get shipping providers',
      });
    }
  }

  /**
   * GET /api/settings/payments
   * Get available payment methods
   */
  static async getAvailablePayments(req: Request, res: Response): Promise<void> {
    try {
      const payments = await platformSettingsService.getSection('payments');
      const methods = payments.methods || {};
      
      const available = Object.keys(methods)
        .filter(key => methods[key]?.enabled)
        .map(key => ({
          method: key,
          enabled: true,
        }));
      
      res.json({
        ok: true,
        data: available,
      });
    } catch (error) {
      console.error('Error getting available payments:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get payment methods',
      });
    }
  }

  /**
   * GET /api/settings/email
   * Get email settings (public-safe)
   */
  static async getEmailSettings(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      const email = (flags.email || {}) as any;
      
      // Return only public-safe flags
      res.json({
        ok: true,
        data: {
          enabled: email.enabled !== false,
          marketing: email.marketing?.enabled !== false,
        },
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
   * GET /api/settings/reviews
   * Get review settings
   */
  static async getReviewSettings(req: Request, res: Response): Promise<void> {
    try {
      const flags = await settingsService.getFeatureFlags();
      const reviews = (flags.reviews || {}) as any;
      
      res.json({
        ok: true,
        data: {
          enabled: reviews.enabled !== false,
          requireModeration: reviews.requireModeration === true,
        },
      });
    } catch (error) {
      console.error('Error getting review settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get review settings',
      });
    }
  }

  /**
   * GET /api/settings/auth/google
   * Get Google OAuth enabled status (public-safe)
   */
  static async getGoogleOAuthStatus(req: Request, res: Response): Promise<void> {
    try {
      const settings = await platformSettingsService.getSettings();
      const authSettings = (settings as any).auth;
      
      // Check if Google OAuth is enabled in platform settings
      // First check nested structure: settings.auth.google.enabled
      let isEnabled = false;
      if (authSettings && authSettings.google) {
        isEnabled = authSettings.google.enabled === true;
      }
      
      // If not found in nested structure, check if it might be in a flattened form
      // This is a fallback for cases where the structure might be different
      if (!isEnabled && (settings as any)['auth.google.enabled'] !== undefined) {
        isEnabled = (settings as any)['auth.google.enabled'] === true;
      }
      
      // Also check if client ID is configured (required for OAuth to work)
      const { settingsService } = await import('../services/SettingsService');
      const clientId = await settingsService.getSetting('GOOGLE_CLIENT_ID');
      
      res.json({
        ok: true,
        data: {
          enabled: isEnabled && !!clientId,
          clientId: clientId || null, // Return client ID for frontend to use
        },
      });
    } catch (error) {
      console.error('Error getting Google OAuth status:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get Google OAuth status',
      });
    }
  }

  /**
   * GET /api/settings/tax-shipping
   * Get tax and shipping settings (public-safe)
   */
  static async getTaxShipping(req: Request, res: Response): Promise<void> {
    try {
      const settings = await platformSettingsService.getSettings();
      const taxShipping = settings.taxShipping || {
        taxRate: 18,
        defaultShippingCost: 0,
        shippingCalculationMethod: 'dynamic',
      };
      
      res.json({
        ok: true,
        data: taxShipping,
      });
    } catch (error) {
      console.error('Error getting tax/shipping settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get tax/shipping settings',
      });
    }
  }
}

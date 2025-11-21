/**
 * Feature Flag Guard Middleware
 * 
 * Protects routes based on feature flags.
 * Returns 403 (or custom status) if feature is disabled.
 */

import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/SettingsService';

/**
 * Middleware to check if a feature is enabled
 * Usage: 
 *   - router.post('/checkout', featureFlagGuard('checkout.guestEnabled'), checkoutController.create);
 *   - router.post('/ai/chat', featureFlagGuard('features.ai.chatEnabled', 503, 'AI chat is disabled'), controller);
 */
export function featureFlagGuard(
  featureKey: string,
  statusCode?: number,
  message?: string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const isEnabled = await settingsService.isFeatureEnabled(featureKey);
      
      if (!isEnabled) {
        res.status(statusCode || 403).json({
          ok: false,
          error: message || 'This feature is currently disabled',
          feature: featureKey,
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Error checking feature flag:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to check feature availability',
      });
    }
  };
}

/**
 * Helper to check feature flag in controllers
 */
export async function checkFeatureEnabled(featureKey: string): Promise<boolean> {
  return await settingsService.isFeatureEnabled(featureKey);
}

/**
 * Payment Settings Controller
 * 
 * Manages payment method toggles (Razorpay, COD, Wallet)
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { settingsService } from '../../services/SettingsService';
import { adminAuditService } from '../../services/AdminAuditService';

const updateMethodSchema = z.object({
  method: z.enum(['razorpay', 'cod', 'wallet']),
  enabled: z.boolean(),
});

export class PaymentSettingsController {
  /**
   * GET /api/admin/settings/payments
   * Get payment method settings
   */
  static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const payments = await settingsService.getSetting('payments') || {};
      
      res.json({
        ok: true,
        data: payments,
      });
    } catch (error) {
      console.error('Error getting payment settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get payment settings',
      });
    }
  }

  /**
   * PATCH /api/admin/settings/payments
   * Update payment method settings
   */
  static async updateMethod(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateMethodSchema.parse(req.body);
      const adminId = req.userId!;

      // Get current settings
      const current = await settingsService.getSetting('payments') || {};
      const methods = current.methods || {};
      const currentMethod = methods[validated.method] || { enabled: false };
      const oldValue = currentMethod.enabled;

      // Update method
      methods[validated.method] = {
        enabled: validated.enabled,
      };

      // Save settings
      await settingsService.updateAppSettings('payments', {
        methods,
      }, adminId);

      // Log audit
      await adminAuditService.logFeatureToggle(
        `payments.${validated.method}`,
        oldValue,
        validated.enabled,
        adminId,
        req,
      );

      res.json({
        ok: true,
        data: {
          method: validated.method,
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

      console.error('Error updating payment method:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update payment method',
      });
    }
  }
}


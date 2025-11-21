/**
 * Price Alert Controller
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { priceAlertService } from '../services/PriceAlertService';

const createAlertSchema = z.object({
  productId: z.string().min(1),
  targetPrice: z.number().positive(),
});

export class PriceAlertController {
  static async createAlert(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const validated = createAlertSchema.parse(req.body);
      const alert = await priceAlertService.createAlert(
        req.userId,
        validated.productId,
        validated.targetPrice
      );

      res.json({ ok: true, data: alert });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error creating price alert:', error);
      res.status(500).json({ ok: false, error: 'Failed to create alert' });
    }
  }

  static async getUserAlerts(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const alerts = await priceAlertService.getUserAlerts(req.userId);
      res.json({ ok: true, data: alerts });
    } catch (error) {
      console.error('Error getting alerts:', error);
      res.status(500).json({ ok: false, error: 'Failed to get alerts' });
    }
  }

  static async removeAlert(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      await priceAlertService.removeAlert(req.userId, id);
      res.json({ ok: true, message: 'Alert removed' });
    } catch (error) {
      console.error('Error removing alert:', error);
      res.status(500).json({ ok: false, error: 'Failed to remove alert' });
    }
  }
}


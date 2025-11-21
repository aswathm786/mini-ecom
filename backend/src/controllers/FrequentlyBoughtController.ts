/**
 * Frequently Bought Together Controller
 */

import { Request, Response } from 'express';
import { frequentlyBoughtService } from '../services/FrequentlyBoughtService';

export class FrequentlyBoughtController {
  static async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;

      const recommendations = await frequentlyBoughtService.getFrequentlyBoughtTogether(
        productId,
        limit
      );

      res.json({ ok: true, data: recommendations });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({ ok: false, error: 'Failed to get recommendations' });
    }
  }

  static async getCartRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const productIds = (req.query.products as string)?.split(',') || [];
      const limit = parseInt(req.query.limit as string) || 5;

      const recommendations = await frequentlyBoughtService.getFrequentlyBoughtWithCart(
        productIds,
        limit
      );

      res.json({ ok: true, data: recommendations });
    } catch (error) {
      console.error('Error getting cart recommendations:', error);
      res.status(500).json({ ok: false, error: 'Failed to get recommendations' });
    }
  }
}


/**
 * Recently Viewed Controller
 */

import { Request, Response } from 'express';
import { recentlyViewedService } from '../services/RecentlyViewedService';

export class RecentlyViewedController {
  static async recordView(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;

      await recentlyViewedService.recordView(productId, req.userId, req.sessionId);

      res.json({ ok: true, message: 'View recorded' });
    } catch (error) {
      console.error('Error recording view:', error);
      res.status(500).json({ ok: false, error: 'Failed to record view' });
    }
  }

  static async getRecentlyViewed(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      const views = await recentlyViewedService.getRecentlyViewedWithProducts(
        req.userId,
        req.sessionId,
        limit
      );

      res.json({ ok: true, data: views });
    } catch (error) {
      console.error('Error getting recently viewed:', error);
      res.status(500).json({ ok: false, error: 'Failed to get recently viewed' });
    }
  }

  static async clearRecentlyViewed(req: Request, res: Response): Promise<void> {
    try {
      await recentlyViewedService.clearRecentlyViewed(req.userId, req.sessionId);
      res.json({ ok: true, message: 'Recently viewed cleared' });
    } catch (error) {
      console.error('Error clearing recently viewed:', error);
      res.status(500).json({ ok: false, error: 'Failed to clear recently viewed' });
    }
  }
}


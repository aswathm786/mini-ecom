/**
 * Web Push Controller
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { webPushService } from '../services/WebPushService';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export class WebPushController {
  static async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const validated = subscriptionSchema.parse(req.body);

      const subscription = await webPushService.saveSubscription(
        validated,
        req.userId,
        req.get('user-agent')
      );

      res.json({ ok: true, data: subscription });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Error subscribing to push:', error);
      res.status(500).json({ ok: false, error: 'Failed to subscribe' });
    }
  }

  static async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        res.status(400).json({ ok: false, error: 'Endpoint required' });
        return;
      }

      await webPushService.removeSubscription(endpoint);
      res.json({ ok: true, message: 'Unsubscribed' });
    } catch (error) {
      console.error('Error unsubscribing:', error);
      res.status(500).json({ ok: false, error: 'Failed to unsubscribe' });
    }
  }

  static async getUserSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const subscriptions = await webPushService.getUserSubscriptions(req.userId);
      res.json({ ok: true, data: subscriptions });
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      res.status(500).json({ ok: false, error: 'Failed to get subscriptions' });
    }
  }

  static async sendToUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }

      const { title, body, icon, badge, data } = req.body;

      const result = await webPushService.sendToUser(req.userId, {
        title,
        body,
        icon,
        badge,
        data,
      });

      res.json({ ok: true, data: result });
    } catch (error) {
      console.error('Error sending push:', error);
      res.status(500).json({ ok: false, error: 'Failed to send push' });
    }
  }

  static async broadcast(req: Request, res: Response): Promise<void> {
    try {
      const { title, body, icon, badge, data, userIds } = req.body;

      const result = await webPushService.broadcast(
        { title, body, icon, badge, data },
        userIds
      );

      res.json({ ok: true, data: result });
    } catch (error) {
      console.error('Error broadcasting push:', error);
      res.status(500).json({ ok: false, error: 'Failed to broadcast' });
    }
  }
}


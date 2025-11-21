import { Request, Response } from 'express';
import { z } from 'zod';
import { adminSecurityService } from '../services/AdminSecurityService';

const whitelistSchema = z.object({
  enabled: z.boolean(),
  ips: z.array(z.string().ip()).max(50),
});

export class AdminSecurityController {
  static async getAdminIpWhitelist(req: Request, res: Response): Promise<void> {
    try {
      const data = await adminSecurityService.getAdminIpWhitelist();
      res.json({ ok: true, data });
    } catch (error) {
      console.error('Get admin whitelist error', error);
      res.status(500).json({ ok: false, error: 'Failed to load whitelist' });
    }
  }

  static async updateAdminIpWhitelist(req: Request, res: Response): Promise<void> {
    try {
      const validated = whitelistSchema.parse(req.body);
      await adminSecurityService.updateWhitelist(validated);
      res.json({ ok: true, data: validated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
        return;
      }
      console.error('Update admin whitelist error', error);
      res.status(500).json({ ok: false, error: 'Failed to update whitelist' });
    }
  }
}



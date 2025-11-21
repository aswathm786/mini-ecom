/**
 * Pincode Controller
 * 
 * Handles pincode lookup requests.
 */

import { Request, Response } from 'express';
import { pincodeService } from '../services/PincodeService';

export class PincodeController {
  /**
   * GET /api/pincode/:pincode
   * Get city and state from pincode
   */
  static async getPincodeData(req: Request, res: Response): Promise<void> {
    try {
      const { pincode } = req.params;

      if (!pincode || !/^\d{6}$/.test(pincode)) {
        res.status(400).json({
          ok: false,
          error: 'Invalid pincode format. Must be 6 digits.',
        });
        return;
      }

      const data = await pincodeService.getPincodeData(pincode);

      if (!data) {
        res.status(404).json({
          ok: false,
          error: 'Pincode not found',
        });
        return;
      }

      res.json({
        ok: true,
        data,
      });
    } catch (error) {
      console.error('Pincode lookup error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch pincode data',
      });
    }
  }
}


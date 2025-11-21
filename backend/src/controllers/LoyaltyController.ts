/**
 * Loyalty Points Controller
 * 
 * Handles loyalty points operations: get balance, redeem, transaction history.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { loyaltyService } from '../services/LoyaltyService';

const redeemPointsSchema = z.object({
  points: z.number().int().positive(),
  orderAmount: z.number().positive(),
});

const adjustPointsSchema = z.object({
  userId: z.string().min(1),
  points: z.number().int(),
  description: z.string().min(1),
});

export class LoyaltyController {
  /**
   * GET /api/loyalty/balance
   * Get user's loyalty points balance
   */
  static async getBalance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const account = await loyaltyService.getAccount(req.userId);
      const config = await loyaltyService.getConfig();

      res.json({
        ok: true,
        data: {
          availablePoints: account.availablePoints,
          totalPoints: account.totalPoints,
          redeemedPoints: account.redeemedPoints,
          expiredPoints: account.expiredPoints,
          config: {
            minRedeemPoints: config.minRedeemPoints,
            pointsPerPoint: config.pointsPerPoint,
            maxRedeemPercentage: config.maxRedeemPercentage,
          },
        },
      });
    } catch (error) {
      console.error('Error getting loyalty balance:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get loyalty balance',
      });
    }
  }

  /**
   * GET /api/loyalty/transactions
   * Get transaction history
   */
  static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const skip = parseInt(req.query.skip as string) || 0;

      const transactions = await loyaltyService.getTransactionHistory(
        req.userId,
        limit,
        skip
      );

      res.json({
        ok: true,
        data: transactions,
      });
    } catch (error) {
      console.error('Error getting transactions:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get transaction history',
      });
    }
  }

  /**
   * POST /api/loyalty/redeem
   * Redeem points for discount (pre-checkout)
   */
  static async redeemPoints(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const validated = redeemPointsSchema.parse(req.body);

      const result = await loyaltyService.redeemPoints(
        req.userId,
        '', // orderId will be set when order is created
        validated.orderAmount,
        validated.points
      );

      res.json({
        ok: true,
        data: {
          discountAmount: result.discountAmount,
          pointsRedeemed: validated.points,
          transaction: result.transaction,
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

      if (error instanceof Error) {
        res.status(400).json({
          ok: false,
          error: error.message,
        });
        return;
      }

      console.error('Error redeeming points:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to redeem points',
      });
    }
  }

  /**
   * POST /api/admin/loyalty/adjust
   * Admin: Adjust user's loyalty points
   */
  static async adjustPoints(req: Request, res: Response): Promise<void> {
    try {
      const validated = adjustPointsSchema.parse(req.body);

      const transaction = await loyaltyService.adjustPoints(
        validated.userId,
        validated.points,
        validated.description,
        req.userId || 'admin'
      );

      res.json({
        ok: true,
        data: transaction,
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

      console.error('Error adjusting points:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to adjust points',
      });
    }
  }

  /**
   * GET /api/admin/loyalty/user/:userId
   * Admin: Get user's loyalty account
   */
  static async getUserAccount(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const account = await loyaltyService.getAccount(userId);
      const transactions = await loyaltyService.getTransactionHistory(userId, 20);

      res.json({
        ok: true,
        data: {
          account,
          recentTransactions: transactions,
        },
      });
    } catch (error) {
      console.error('Error getting user account:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get user account',
      });
    }
  }
}


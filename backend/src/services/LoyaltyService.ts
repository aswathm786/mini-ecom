/**
 * Loyalty Points Service
 * 
 * Manages loyalty points: earn on purchases, redeem for discounts.
 */

import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';
import { platformSettingsService } from './PlatformSettingsService';

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'expire' | 'adjustment';

export interface LoyaltyTransaction {
  _id?: string;
  userId: string;
  type: LoyaltyTransactionType;
  points: number; // Positive for earn, negative for redeem
  orderId?: string; // Associated order
  description?: string;
  expiresAt?: Date; // Points expiration
  createdAt: Date;
}

export interface LoyaltyAccount {
  _id?: string;
  userId: string;
  totalPoints: number; // Total points ever earned
  availablePoints: number; // Points available to redeem
  redeemedPoints: number; // Total points redeemed
  expiredPoints: number; // Total points expired
  createdAt: Date;
  updatedAt: Date;
}

interface LoyaltyConfig {
  pointsPerRupee: number; // Points earned per rupee spent
  pointsPerPoint: number; // Rupees per point when redeeming
  minRedeemPoints: number; // Minimum points required to redeem
  maxRedeemPercentage: number; // Max % of order that can be paid with points
  pointsExpiryDays?: number; // Points expire after X days (optional)
}

const DEFAULT_CONFIG: LoyaltyConfig = {
  pointsPerRupee: 0.1, // 1 point per ₹10 spent
  pointsPerPoint: 0.1, // 1 point = ₹0.10
  minRedeemPoints: 100, // Minimum 100 points to redeem
  maxRedeemPercentage: 50, // Max 50% of order can be paid with points
  pointsExpiryDays: 365, // Points expire after 1 year
};

class LoyaltyService {
  /**
   * Get or create loyalty account for user
   */
  async getAccount(userId: string): Promise<LoyaltyAccount> {
    const db = mongo.getDb();
    const accountsCollection = db.collection<LoyaltyAccount>('loyalty_accounts');

    let account = await accountsCollection.findOne({ userId });

    if (!account) {
      // Create new account
      const newAccount: LoyaltyAccount = {
        userId,
        totalPoints: 0,
        availablePoints: 0,
        redeemedPoints: 0,
        expiredPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await accountsCollection.insertOne(newAccount);
      newAccount._id = result.insertedId.toString();
      return newAccount;
    }

    // Update available points (handle expiration)
    await this.updateExpiredPoints(userId);

    return (await accountsCollection.findOne({ userId }))!;
  }

  /**
   * Earn points from order
   */
  async earnPoints(
    userId: string,
    orderId: string,
    orderAmount: number,
    config?: Partial<LoyaltyConfig>
  ): Promise<LoyaltyTransaction> {
    const settings = await platformSettingsService.getSettings();
    if (!settings.features.loyalty.enabled) {
      throw new Error('Loyalty program is disabled');
    }

    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const pointsEarned = Math.floor(orderAmount * finalConfig.pointsPerRupee);

    if (pointsEarned <= 0) {
      throw new Error('No points to earn for this order');
    }

    const db = mongo.getDb();
    const accountsCollection = db.collection<LoyaltyAccount>('loyalty_accounts');
    const transactionsCollection = db.collection<LoyaltyTransaction>('loyalty_transactions');

    // Calculate expiration date
    let expiresAt: Date | undefined;
    if (finalConfig.pointsExpiryDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + finalConfig.pointsExpiryDays);
    }

    // Create transaction
    const transaction: LoyaltyTransaction = {
      userId,
      type: 'earn',
      points: pointsEarned,
      orderId,
      description: `Earned ${pointsEarned} points from order ${orderId}`,
      expiresAt,
      createdAt: new Date(),
    };

    const transactionResult = await transactionsCollection.insertOne(transaction);
    transaction._id = transactionResult.insertedId.toString();

    // Update account
    await accountsCollection.updateOne(
      { userId },
      {
        $inc: {
          totalPoints: pointsEarned,
          availablePoints: pointsEarned,
        },
        $setOnInsert: {
          userId,
          redeemedPoints: 0,
          expiredPoints: 0,
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return transaction;
  }

  /**
   * Redeem points for discount
   */
  async redeemPoints(
    userId: string,
    orderId: string,
    pointsToRedeem: number,
    orderAmount: number,
    config?: Partial<LoyaltyConfig>
  ): Promise<{ transaction: LoyaltyTransaction; discountAmount: number }> {
    const settings = await platformSettingsService.getSettings();
    if (!settings.features.loyalty.enabled) {
      throw new Error('Loyalty program is disabled');
    }

    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Validate minimum points
    if (pointsToRedeem < finalConfig.minRedeemPoints) {
      throw new Error(
        `Minimum ${finalConfig.minRedeemPoints} points required to redeem`
      );
    }

    // Get account
    const account = await this.getAccount(userId);

    // Validate available points
    if (account.availablePoints < pointsToRedeem) {
      throw new Error('Insufficient points');
    }

    // Calculate discount amount
    const discountAmount = pointsToRedeem * finalConfig.pointsPerPoint;

    // Check max redeem percentage
    const maxDiscount = (orderAmount * finalConfig.maxRedeemPercentage) / 100;
    if (discountAmount > maxDiscount) {
      const adjustedPoints = Math.floor(maxDiscount / finalConfig.pointsPerPoint);
      throw new Error(
        `Maximum ${finalConfig.maxRedeemPercentage}% of order can be paid with points. You can redeem up to ${adjustedPoints} points.`
      );
    }

    const db = mongo.getDb();
    const accountsCollection = db.collection<LoyaltyAccount>('loyalty_accounts');
    const transactionsCollection = db.collection<LoyaltyTransaction>('loyalty_transactions');

    // Create transaction
    const transaction: LoyaltyTransaction = {
      userId,
      type: 'redeem',
      points: -pointsToRedeem,
      orderId,
      description: `Redeemed ${pointsToRedeem} points for ₹${discountAmount.toFixed(2)} discount`,
      createdAt: new Date(),
    };

    const transactionResult = await transactionsCollection.insertOne(transaction);
    transaction._id = transactionResult.insertedId.toString();

    // Update account
    await accountsCollection.updateOne(
      { userId },
      {
        $inc: {
          availablePoints: -pointsToRedeem,
          redeemedPoints: pointsToRedeem,
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    return {
      transaction,
      discountAmount: Math.round(discountAmount * 100) / 100,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit = 50,
    skip = 0
  ): Promise<LoyaltyTransaction[]> {
    const db = mongo.getDb();
    const transactionsCollection = db.collection<LoyaltyTransaction>('loyalty_transactions');

    return await transactionsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  /**
   * Update expired points
   */
  private async updateExpiredPoints(userId: string): Promise<void> {
    const db = mongo.getDb();
    const accountsCollection = db.collection<LoyaltyAccount>('loyalty_accounts');
    const transactionsCollection = db.collection<LoyaltyTransaction>('loyalty_transactions');

    const now = new Date();

    // Find expired transactions that haven't been processed
    const expiredTransactions = await transactionsCollection
      .find({
        userId,
        type: 'earn',
        expiresAt: { $lt: now },
        points: { $gt: 0 },
      })
      .toArray();

    if (expiredTransactions.length === 0) {
      return;
    }

    // Calculate total expired points
    const expiredPoints = expiredTransactions.reduce(
      (sum, t) => sum + t.points,
      0
    );

    // Mark transactions as expired
    const transactionIds = expiredTransactions.map((t) => t._id);
    await transactionsCollection.updateMany(
      { _id: { $in: transactionIds } },
      { $set: { type: 'expire' as LoyaltyTransactionType } }
    );

    // Create expiration transaction
    await transactionsCollection.insertOne({
      userId,
      type: 'expire',
      points: -expiredPoints,
      description: `Expired ${expiredPoints} points`,
      createdAt: new Date(),
    });

    // Update account
    await accountsCollection.updateOne(
      { userId },
      {
        $inc: {
          availablePoints: -expiredPoints,
          expiredPoints: expiredPoints,
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Get loyalty config (can be stored in settings)
   */
  async getConfig(): Promise<LoyaltyConfig> {
    // In production, load from settings collection
    return DEFAULT_CONFIG;
  }

  /**
   * Admin: Adjust points (manual adjustment)
   */
  async adjustPoints(
    userId: string,
    points: number,
    description: string,
    adminId: string
  ): Promise<LoyaltyTransaction> {
    const settings = await platformSettingsService.getSettings();
    if (!settings.features.loyalty.enabled) {
      throw new Error('Loyalty program is disabled');
    }

    const db = mongo.getDb();
    const accountsCollection = db.collection<LoyaltyAccount>('loyalty_accounts');
    const transactionsCollection = db.collection<LoyaltyTransaction>('loyalty_transactions');

    const transaction: LoyaltyTransaction = {
      userId,
      type: 'adjustment',
      points,
      description: `${description} (Admin: ${adminId})`,
      createdAt: new Date(),
    };

    const transactionResult = await transactionsCollection.insertOne(transaction);
    transaction._id = transactionResult.insertedId.toString();

    // Update account
    await accountsCollection.updateOne(
      { userId },
      {
        $inc: {
          totalPoints: points > 0 ? points : 0,
          availablePoints: points,
        },
        $setOnInsert: {
          userId,
          redeemedPoints: 0,
          expiredPoints: 0,
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return transaction;
  }
}

export const loyaltyService = new LoyaltyService();


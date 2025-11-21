/**
 * Price Drop Alert Service
 * 
 * Manages price drop subscriptions and notifications.
 */

import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';
import { productService } from './ProductService';
import { emailTriggerService } from './EmailTriggerService';
import { EmailEventType } from './EmailTriggerService';

export interface PriceAlert {
  _id?: string;
  userId: string;
  productId: string;
  targetPrice: number; // Alert when price drops to or below this
  currentPrice: number; // Price when alert was created
  isActive: boolean;
  notified: boolean; // Whether user has been notified
  createdAt: Date;
  updatedAt: Date;
}

class PriceAlertService {
  /**
   * Create or update price alert
   */
  async createAlert(
    userId: string,
    productId: string,
    targetPrice: number
  ): Promise<PriceAlert> {
    const db = mongo.getDb();
    const alertsCollection = db.collection<PriceAlert>('price_alerts');
    const productsCollection = db.collection('products');

    // Get current product price
    const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
    if (!product) {
      throw new Error('Product not found');
    }

    const currentPrice = product.price || 0;

    // Check if alert already exists
    const existing = await alertsCollection.findOne({
      userId,
      productId,
      isActive: true,
    });

    if (existing) {
      // Update existing alert
      await alertsCollection.updateOne(
        { _id: existing._id },
        {
          $set: {
            targetPrice,
            currentPrice,
            notified: false,
            updatedAt: new Date(),
          },
        }
      );
      return (await alertsCollection.findOne({ _id: existing._id }))!;
    }

    // Create new alert
    const alert: PriceAlert = {
      userId,
      productId,
      targetPrice,
      currentPrice,
      isActive: true,
      notified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await alertsCollection.insertOne(alert);
    alert._id = result.insertedId.toString();

    return alert;
  }

  /**
   * Get user's active alerts
   */
  async getUserAlerts(userId: string): Promise<PriceAlert[]> {
    const db = mongo.getDb();
    const alertsCollection = db.collection<PriceAlert>('price_alerts');

    return await alertsCollection
      .find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Remove alert
   */
  async removeAlert(userId: string, alertId: string): Promise<void> {
    const db = mongo.getDb();
    const alertsCollection = db.collection<PriceAlert>('price_alerts');

    await alertsCollection.updateOne(
      { _id: new ObjectId(alertId), userId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
  }

  /**
   * Check and send price drop notifications
   * This should be run periodically (e.g., via cron job)
   */
  async checkAndNotifyPriceDrops(): Promise<number> {
    const db = mongo.getDb();
    const alertsCollection = db.collection<PriceAlert>('price_alerts');
    const productsCollection = db.collection('products');
    const usersCollection = db.collection('users');

    // Get all active alerts
    const alerts = await alertsCollection.find({ isActive: true, notified: false }).toArray();

    let notifiedCount = 0;

    for (const alert of alerts) {
      try {
        // Get current product price
        const product = await productsCollection.findOne({
          _id: new ObjectId(alert.productId),
        });

        if (!product) {
          // Product no longer exists, deactivate alert
          await alertsCollection.updateOne(
            { _id: alert._id },
            { $set: { isActive: false, updatedAt: new Date() } }
          );
          continue;
        }

        const currentPrice = product.price || 0;

        // Check if price has dropped to or below target
        if (currentPrice <= alert.targetPrice && currentPrice < alert.currentPrice) {
          // Get user details
          const user = await usersCollection.findOne({ _id: new ObjectId(alert.userId) });
          if (!user || !user.email) {
            continue;
          }

          // Send email notification
          await emailTriggerService.sendTemplateEmail(
            EmailEventType.PRICE_DROP,
            user.email,
            {
              userName: user.firstName || user.email,
              productName: product.name || 'Product',
              oldPrice: `₹${alert.currentPrice.toFixed(2)}`,
              newPrice: `₹${currentPrice.toFixed(2)}`,
              productUrl: `${process.env.FRONTEND_URL || 'https://example.com'}/products/${product.slug || product._id}`,
            }
          ).catch((err) => {
            console.error(`Failed to send price drop email to ${user.email}:`, err);
          });

          // Mark as notified
          await alertsCollection.updateOne(
            { _id: alert._id },
            {
              $set: {
                notified: true,
                currentPrice,
                updatedAt: new Date(),
              },
            }
          );

          notifiedCount++;
        } else {
          // Update current price if it changed
          if (currentPrice !== alert.currentPrice) {
            await alertsCollection.updateOne(
              { _id: alert._id },
              {
                $set: {
                  currentPrice,
                  updatedAt: new Date(),
                },
              }
            );
          }
        }
      } catch (error) {
        console.error(`Error processing price alert ${alert._id}:`, error);
      }
    }

    return notifiedCount;
  }

  /**
   * Get alert by ID
   */
  async getAlert(alertId: string, userId: string): Promise<PriceAlert | null> {
    const db = mongo.getDb();
    const alertsCollection = db.collection<PriceAlert>('price_alerts');

    return await alertsCollection.findOne({
      _id: new ObjectId(alertId),
      userId,
    });
  }
}

export const priceAlertService = new PriceAlertService();


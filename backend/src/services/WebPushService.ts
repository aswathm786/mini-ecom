/**
 * Web Push Notification Service
 * 
 * Manages web push notification subscriptions and sending.
 */

import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';

export interface PushSubscription {
  _id?: string;
  userId?: string; // Optional for guest subscriptions
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PushMessage {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class WebPushService {
  /**
   * Save push subscription
   */
  async saveSubscription(
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
    userId?: string,
    userAgent?: string
  ): Promise<PushSubscription> {
    const db = mongo.getDb();
    const subscriptionsCollection = db.collection<PushSubscription>('push_subscriptions');

    // Check if subscription already exists
    const existing = await subscriptionsCollection.findOne({
      endpoint: subscription.endpoint,
    });

    if (existing) {
      // Update existing subscription
      await subscriptionsCollection.updateOne(
        { _id: existing._id },
        {
          $set: {
            userId,
            keys: subscription.keys,
            userAgent,
            updatedAt: new Date(),
          },
        }
      );
      return (await subscriptionsCollection.findOne({ _id: existing._id }))!;
    }

    // Create new subscription
    const newSubscription: PushSubscription = {
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await subscriptionsCollection.insertOne(newSubscription);
    newSubscription._id = result.insertedId.toString();

    return newSubscription;
  }

  /**
   * Remove push subscription
   */
  async removeSubscription(endpoint: string): Promise<void> {
    const db = mongo.getDb();
    const subscriptionsCollection = db.collection<PushSubscription>('push_subscriptions');

    await subscriptionsCollection.deleteOne({ endpoint });
  }

  /**
   * Get user's push subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    const db = mongo.getDb();
    const subscriptionsCollection = db.collection<PushSubscription>('push_subscriptions');

    return await subscriptionsCollection.find({ userId }).toArray();
  }

  /**
   * Send push notification to user
   * Note: This is a placeholder. In production, you'd use a library like 'web-push'
   * and VAPID keys for authentication.
   */
  async sendToUser(
    userId: string,
    message: PushMessage
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await this.getUserSubscriptions(userId);

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        // In production, use web-push library:
        // await webpush.sendNotification(subscription, JSON.stringify(message));
        console.log(`Would send push to ${subscription.endpoint}:`, message);
        sent++;
      } catch (error) {
        console.error(`Failed to send push to ${subscription.endpoint}:`, error);
        failed++;
        // Remove invalid subscription
        await this.removeSubscription(subscription.endpoint);
      }
    }

    return { sent, failed };
  }

  /**
   * Send push notification to all users (broadcast)
   */
  async broadcast(
    message: PushMessage,
    userIds?: string[]
  ): Promise<{ sent: number; failed: number }> {
    const db = mongo.getDb();
    const subscriptionsCollection = db.collection<PushSubscription>('push_subscriptions');

    const query: any = {};
    if (userIds && userIds.length > 0) {
      query.userId = { $in: userIds };
    } else {
      query.userId = { $exists: true, $ne: null };
    }

    const subscriptions = await subscriptionsCollection.find(query).toArray();

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        // In production, use web-push library
        console.log(`Would broadcast push to ${subscription.endpoint}:`, message);
        sent++;
      } catch (error) {
        console.error(`Failed to broadcast push to ${subscription.endpoint}:`, error);
        failed++;
        // Remove invalid subscription
        await this.removeSubscription(subscription.endpoint);
      }
    }

    return { sent, failed };
  }

  /**
   * Merge guest subscriptions into user subscriptions (on login)
   */
  async mergeGuestSubscriptions(userId: string, sessionId: string): Promise<void> {
    const db = mongo.getDb();
    const subscriptionsCollection = db.collection<PushSubscription>('push_subscriptions');

    // This would need sessionId tracking - simplified version
    // In production, you'd track subscriptions by sessionId when user is not logged in
    console.log(`Would merge guest subscriptions for user ${userId}`);
  }
}

export const webPushService = new WebPushService();


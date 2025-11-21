/**
 * Recently Viewed Products Service
 * 
 * Tracks and retrieves recently viewed products for users.
 */

import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';

export interface RecentlyViewed {
  _id?: string;
  userId?: string; // Optional for guest users
  sessionId?: string; // For guest tracking
  productId: string;
  viewedAt: Date;
}

class RecentlyViewedService {
  /**
   * Record a product view
   */
  async recordView(
    productId: string,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    if (!userId && !sessionId) {
      return; // Can't track without user or session
    }

    const db = mongo.getDb();
    const viewsCollection = db.collection<RecentlyViewed>('recently_viewed');

    // Check if view already exists (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existing = await viewsCollection.findOne({
      productId,
      ...(userId ? { userId } : { sessionId }),
      viewedAt: { $gte: oneHourAgo },
    });

    if (existing) {
      // Update timestamp
      await viewsCollection.updateOne(
        { _id: existing._id },
        { $set: { viewedAt: new Date() } }
      );
      return;
    }

    // Create new view record
    await viewsCollection.insertOne({
      userId,
      sessionId,
      productId,
      viewedAt: new Date(),
    });

    // Clean up old views (keep last 50 per user/session)
    await this.cleanupOldViews(userId, sessionId);
  }

  /**
   * Get recently viewed products
   */
  async getRecentlyViewed(
    userId?: string,
    sessionId?: string,
    limit = 20
  ): Promise<Array<{ productId: string; viewedAt: Date }>> {
    if (!userId && !sessionId) {
      return [];
    }

    const db = mongo.getDb();
    const viewsCollection = db.collection<RecentlyViewed>('recently_viewed');

    const query: any = {};
    if (userId) {
      query.userId = userId;
    } else {
      query.sessionId = sessionId;
    }

    const views = await viewsCollection
      .find(query)
      .sort({ viewedAt: -1 })
      .limit(limit)
      .toArray();

    // Remove duplicates (same product viewed multiple times)
    const uniqueProducts = new Map<string, Date>();
    for (const view of views) {
      if (!uniqueProducts.has(view.productId)) {
        uniqueProducts.set(view.productId, view.viewedAt);
      }
    }

    return Array.from(uniqueProducts.entries()).map(([productId, viewedAt]) => ({
      productId,
      viewedAt,
    }));
  }

  /**
   * Get recently viewed products with product details
   */
  async getRecentlyViewedWithProducts(
    userId?: string,
    sessionId?: string,
    limit = 20
  ): Promise<Array<any>> {
    const views = await this.getRecentlyViewed(userId, sessionId, limit);

    if (views.length === 0) {
      return [];
    }

    const db = mongo.getDb();
    const productsCollection = db.collection('products');

    const productIds = views.map((v) => new ObjectId(v.productId));
    const products = await productsCollection
      .find({ _id: { $in: productIds } })
      .toArray();

    // Map products to views
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    return views
      .map((view) => ({
        ...view,
        product: productMap.get(view.productId) || null,
      }))
      .filter((item) => item.product !== null);
  }

  /**
   * Clear recently viewed for user/session
   */
  async clearRecentlyViewed(userId?: string, sessionId?: string): Promise<void> {
    if (!userId && !sessionId) {
      return;
    }

    const db = mongo.getDb();
    const viewsCollection = db.collection<RecentlyViewed>('recently_viewed');

    const query: any = {};
    if (userId) {
      query.userId = userId;
    } else {
      query.sessionId = sessionId;
    }

    await viewsCollection.deleteMany(query);
  }

  /**
   * Clean up old views (keep only last 50)
   */
  private async cleanupOldViews(
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    if (!userId && !sessionId) {
      return;
    }

    const db = mongo.getDb();
    const viewsCollection = db.collection<RecentlyViewed>('recently_viewed');

    const query: any = {};
    if (userId) {
      query.userId = userId;
    } else {
      query.sessionId = sessionId;
    }

    // Get all views sorted by date
    const allViews = await viewsCollection
      .find(query)
      .sort({ viewedAt: -1 })
      .toArray();

    // Keep only last 50
    if (allViews.length > 50) {
      const toDelete = allViews.slice(50);
      const idsToDelete = toDelete.map((v) => v._id!);
      await viewsCollection.deleteMany({ _id: { $in: idsToDelete } });
    }
  }

  /**
   * Merge guest views into user views (when user logs in)
   */
  async mergeGuestViews(userId: string, sessionId: string): Promise<void> {
    const db = mongo.getDb();
    const viewsCollection = db.collection<RecentlyViewed>('recently_viewed');

    // Get guest views
    const guestViews = await viewsCollection.find({ sessionId }).toArray();

    if (guestViews.length === 0) {
      return;
    }

    // Update to user views
    for (const view of guestViews) {
      // Check if user already viewed this product
      const existing = await viewsCollection.findOne({
        userId,
        productId: view.productId,
      });

      if (existing) {
        // Keep the more recent view
        if (view.viewedAt > existing.viewedAt) {
          await viewsCollection.updateOne(
            { _id: existing._id },
            { $set: { viewedAt: view.viewedAt } }
          );
        }
        // Delete guest view
        await viewsCollection.deleteOne({ _id: view._id });
      } else {
        // Convert to user view
        await viewsCollection.updateOne(
          { _id: view._id },
          { $set: { userId, sessionId: undefined } }
        );
      }
    }
  }
}

export const recentlyViewedService = new RecentlyViewedService();


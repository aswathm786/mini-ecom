/**
 * Frequently Bought Together Service
 * 
 * Analyzes order patterns to suggest products frequently bought together.
 */

import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';

interface ProductPair {
  productId1: string;
  productId2: string;
  count: number; // Number of times bought together
}

class FrequentlyBoughtService {
  /**
   * Get products frequently bought together with a given product
   */
  async getFrequentlyBoughtTogether(
    productId: string,
    limit = 5
  ): Promise<Array<{ productId: string; score: number }>> {
    const db = mongo.getDb();
    const ordersCollection = db.collection('orders');

    // Get all orders that contain this product
    const orders = await ordersCollection
      .find({
        'items.productId': productId,
        status: { $in: ['delivered', 'shipped', 'processing'] }, // Only completed orders
      })
      .toArray();

    if (orders.length === 0) {
      return [];
    }

    // Count product pairs
    const pairCounts = new Map<string, number>();

    for (const order of orders) {
      const productIds = order.items
        .map((item: any) => item.productId)
        .filter((id: string) => id !== productId);

      // Count pairs
      for (const otherProductId of productIds) {
        const key = otherProductId;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }

    // Convert to array and sort by count
    const pairs = Array.from(pairCounts.entries())
      .map(([productId, count]) => ({
        productId,
        score: count / orders.length, // Normalize by number of orders
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return pairs;
  }

  /**
   * Get products frequently bought together with multiple products (cart-based)
   */
  async getFrequentlyBoughtWithCart(
    productIds: string[],
    limit = 5
  ): Promise<Array<{ productId: string; score: number }>> {
    if (productIds.length === 0) {
      return [];
    }

    const db = mongo.getDb();
    const ordersCollection = db.collection('orders');

    // Get orders that contain at least one of the products
    const orders = await ordersCollection
      .find({
        'items.productId': { $in: productIds },
        status: { $in: ['delivered', 'shipped', 'processing'] },
      })
      .toArray();

    if (orders.length === 0) {
      return [];
    }

    // Count products that appear with the given products
    const productCounts = new Map<string, number>();

    for (const order of orders) {
      const orderProductIds = order.items.map((item: any) => item.productId);
      const matchingProducts = orderProductIds.filter((id: string) =>
        productIds.includes(id)
      );

      if (matchingProducts.length > 0) {
        // Count other products in the same order
        for (const productId of orderProductIds) {
          if (!productIds.includes(productId)) {
            productCounts.set(productId, (productCounts.get(productId) || 0) + 1);
          }
        }
      }
    }

    // Convert to array and sort
    const recommendations = Array.from(productCounts.entries())
      .map(([productId, count]) => ({
        productId,
        score: count / orders.length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations;
  }

  /**
   * Rebuild frequently bought together cache (admin function)
   * This can be run periodically to update recommendations
   */
  async rebuildCache(): Promise<void> {
    // This is a placeholder for a more sophisticated caching mechanism
    // In production, you might want to pre-compute and cache these recommendations
    console.log('Frequently bought together cache rebuild - not implemented yet');
  }
}

export const frequentlyBoughtService = new FrequentlyBoughtService();


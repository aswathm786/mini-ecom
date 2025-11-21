/**
 * Wishlist Service
 * 
 * Manages user wishlists - add/remove items, move to cart.
 */

import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';

export interface WishlistItem {
  productId: string;
  addedAt: Date;
}

export interface Wishlist {
  _id?: string;
  userId: string;
  items: WishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

class WishlistService {
  /**
   * Get user's wishlist
   */
  async getWishlist(userId: string): Promise<Wishlist | null> {
    const db = mongo.getDb();
    const wishlistsCollection = db.collection<Wishlist>('wishlists');

    const wishlist = await wishlistsCollection.findOne({ userId });
    return wishlist;
  }

  /**
   * Add item to wishlist
   */
  async addItem(userId: string, productId: string): Promise<Wishlist> {
    const db = mongo.getDb();
    const wishlistsCollection = db.collection<Wishlist>('wishlists');

    // Check if item already exists
    const existing = await wishlistsCollection.findOne({
      userId,
      'items.productId': productId,
    });

    if (existing) {
      // Item already in wishlist
      return existing;
    }

    // Add item
    const result = await wishlistsCollection.findOneAndUpdate(
      { userId },
      {
        $push: {
          items: {
            productId,
            addedAt: new Date(),
          },
        },
        $setOnInsert: {
          userId,
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    return result.value || (await this.getWishlist(userId))!;
  }

  /**
   * Remove item from wishlist
   */
  async removeItem(userId: string, productId: string): Promise<Wishlist | null> {
    const db = mongo.getDb();
    const wishlistsCollection = db.collection<Wishlist>('wishlists');

    const result = await wishlistsCollection.findOneAndUpdate(
      { userId },
      {
        $pull: {
          items: { productId },
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: 'after',
      }
    );

    return result.value || null;
  }

  /**
   * Check if product is in wishlist
   */
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const wishlist = await this.getWishlist(userId);
    if (!wishlist) {
      return false;
    }

    return wishlist.items.some((item) => item.productId === productId);
  }

  /**
   * Get wishlist items with product details
   */
  async getWishlistWithProducts(userId: string): Promise<Array<WishlistItem & { product: any }>> {
    const wishlist = await this.getWishlist(userId);
    if (!wishlist || wishlist.items.length === 0) {
      return [];
    }

    const db = mongo.getDb();
    const productsCollection = db.collection('products');

    const productIds = wishlist.items.map((item) => new ObjectId(item.productId));
    const products = await productsCollection
      .find({ _id: { $in: productIds } })
      .toArray();

    const productMap = new Map(
      products.map((p) => [p._id.toString(), p])
    );

    return wishlist.items
      .map((item) => ({
        ...item,
        product: productMap.get(item.productId) || null,
      }))
      .filter((item) => item.product !== null);
  }

  /**
   * Clear wishlist
   */
  async clearWishlist(userId: string): Promise<void> {
    const db = mongo.getDb();
    const wishlistsCollection = db.collection<Wishlist>('wishlists');

    await wishlistsCollection.updateOne(
      { userId },
      {
        $set: {
          items: [],
          updatedAt: new Date(),
        },
      }
    );
  }
}

export const wishlistService = new WishlistService();


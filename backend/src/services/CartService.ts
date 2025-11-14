/**
 * Cart Service
 * 
 * Manages shopping cart for both authenticated and anonymous users.
 * Authenticated users: cart stored in MongoDB
 * Anonymous users: cart stored in session cookie (placeholder - will use sessions collection)
 */

import { Db, ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';
import { inventoryService } from './InventoryService';

export interface CartItem {
  productId: string;
  qty: number;
  priceAt: number; // Price at time of adding to cart
  name?: string; // Product name for display
}

export interface Cart {
  _id?: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  updatedAt: Date;
}

class CartService {
  /**
   * Get cart for user or session
   */
  async getCart(userId?: string, sessionId?: string): Promise<Cart | null> {
    const db = mongo.getDb();
    const cartsCollection = db.collection<Cart>('carts');
    
    if (userId) {
      const cart = await cartsCollection.findOne({ userId });
      return cart;
    } else if (sessionId) {
      const cart = await cartsCollection.findOne({ sessionId });
      return cart;
    }
    
    return null;
  }

  /**
   * Create or update cart
   */
  async saveCart(cart: Cart): Promise<Cart> {
    const db = mongo.getDb();
    const cartsCollection = db.collection<Cart>('carts');
    
    cart.updatedAt = new Date();
    
    if (cart._id) {
      const cartObjId = new ObjectId(cart._id);
      await cartsCollection.updateOne(
        { _id: cartObjId },
        { $set: cart }
      );
      return cart;
    } else {
      const result = await cartsCollection.insertOne(cart);
      cart._id = result.insertedId.toString();
      return cart;
    }
  }

  /**
   * Add item to cart
   */
  async addItem(
    userId: string | undefined,
    sessionId: string | undefined,
    productId: string,
    quantity: number,
    productPrice: number,
    productName?: string
  ): Promise<Cart> {
    const cart = await this.getCart(userId, sessionId) || {
      userId,
      sessionId,
      items: [],
      updatedAt: new Date(),
    };
    
    // Check if item already exists
    const existingIndex = cart.items.findIndex(
      item => item.productId === productId
    );
    
    if (existingIndex >= 0) {
      // Update quantity
      cart.items[existingIndex].qty += quantity;
    } else {
      // Add new item
      cart.items.push({
        productId,
        qty: quantity,
        priceAt: productPrice,
        name: productName,
      });
    }
    
    return await this.saveCart(cart);
  }

  /**
   * Update item quantity
   */
  async updateItem(
    userId: string | undefined,
    sessionId: string | undefined,
    productId: string,
    quantity: number
  ): Promise<Cart | null> {
    const cart = await this.getCart(userId, sessionId);
    
    if (!cart) {
      return null;
    }
    
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex >= 0) {
      if (quantity <= 0) {
        // Remove item
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].qty = quantity;
      }
      
      return await this.saveCart(cart);
    }
    
    return cart;
  }

  /**
   * Remove item from cart
   */
  async removeItem(
    userId: string | undefined,
    sessionId: string | undefined,
    productId: string
  ): Promise<Cart | null> {
    const cart = await this.getCart(userId, sessionId);
    
    if (!cart) {
      return null;
    }
    
    cart.items = cart.items.filter(item => item.productId !== productId);
    
    return await this.saveCart(cart);
  }

  /**
   * Clear cart
   */
  async clearCart(userId?: string, sessionId?: string): Promise<boolean> {
    const db = mongo.getDb();
    const cartsCollection = db.collection<Cart>('carts');
    
    try {
      if (userId) {
        await cartsCollection.deleteOne({ userId });
      } else if (sessionId) {
        await cartsCollection.deleteOne({ sessionId });
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  /**
   * Validate cart items (check inventory)
   */
  async validateCart(cart: Cart): Promise<{
    valid: boolean;
    errors: Array<{ productId: string; error: string; availableQty?: number }>;
  }> {
    const errors: Array<{ productId: string; error: string; availableQty?: number }> = [];
    
    // Validate all items in parallel
    const validations = await Promise.all(
      cart.items.map(async (item) => {
        const inventory = await inventoryService.getInventory(item.productId);
        
        if (!inventory) {
          return {
            productId: item.productId,
            error: 'Product not found or out of stock',
          };
        }
        
        if (inventory.qty < item.qty) {
          return {
            productId: item.productId,
            error: 'Insufficient inventory',
            availableQty: inventory.qty,
          };
        }
        
        return null;
      })
    );
    
    // Filter out null results (valid items)
    const itemErrors = validations.filter((error): error is { productId: string; error: string; availableQty?: number } => error !== null);
    errors.push(...itemErrors);
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const cartService = new CartService();


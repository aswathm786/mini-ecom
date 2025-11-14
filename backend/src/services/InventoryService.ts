/**
 * Inventory Service
 * 
 * Manages product inventory levels and stock checks.
 * Uses atomic MongoDB operations to prevent race conditions.
 */

import { Db, ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';

export interface InventoryItem {
  _id?: string;
  productId: string;
  qty: number;
  lowStockThreshold: number;
  updatedAt: Date;
}

export interface ReserveResult {
  success: boolean;
  availableQty?: number;
  error?: string;
}

class InventoryService {
  /**
   * Get inventory for a product
   */
  async getInventory(productId: string): Promise<InventoryItem | null> {
    const db = mongo.getDb();
    const inventoryCollection = db.collection<InventoryItem>('inventory');
    
    try {
      const productObjId = new ObjectId(productId);
      const inventory = await inventoryCollection.findOne({ productId: productObjId });
      return inventory;
    } catch (error) {
      console.error('Error getting inventory:', error);
      return null;
    }
  }

  /**
   * Get inventory for multiple products
   */
  async getInventoryForProducts(productIds: string[]): Promise<Map<string, InventoryItem>> {
    const db = mongo.getDb();
    const inventoryCollection = db.collection<InventoryItem>('inventory');
    
    const objectIds = productIds.map(id => new ObjectId(id));
    const inventoryItems = await inventoryCollection.find({
      productId: { $in: objectIds },
    }).toArray();
    
    const inventoryMap = new Map<string, InventoryItem>();
    inventoryItems.forEach(item => {
      if (item.productId) {
        inventoryMap.set(item.productId.toString(), item);
      }
    });
    
    return inventoryMap;
  }

  /**
   * Reserve inventory (atomic decrement)
   * Returns success if enough stock available, otherwise returns error
   * 
   * NOTE: In production, consider using MongoDB transactions or a reservation
   * system to handle concurrent checkout requests and prevent overselling.
   */
  async reserveInventory(
    productId: string,
    quantity: number
  ): Promise<ReserveResult> {
    const db = mongo.getDb();
    const inventoryCollection = db.collection<InventoryItem>('inventory');
    
    try {
      const productObjId = new ObjectId(productId);
      
      // Atomic update: decrement quantity only if sufficient stock available
      const result = await inventoryCollection.findOneAndUpdate(
        {
          productId: productObjId,
          qty: { $gte: quantity }, // Only update if qty >= requested
        },
        {
          $inc: { qty: -quantity },
          $set: { updatedAt: new Date() },
        },
        {
          returnDocument: 'after',
        }
      );
      
      if (!result.value) {
        // Check current stock to return available quantity
        const current = await inventoryCollection.findOne({ productId: productObjId });
        return {
          success: false,
          availableQty: current?.qty || 0,
          error: 'Insufficient inventory',
        };
      }
      
      return {
        success: true,
        availableQty: result.value.qty,
      };
    } catch (error) {
      console.error('Error reserving inventory:', error);
      return {
        success: false,
        error: 'Failed to reserve inventory',
      };
    }
  }

  /**
   * Restore inventory (increment) - used for order cancellation/refund
   */
  async restoreInventory(productId: string, quantity: number): Promise<boolean> {
    const db = mongo.getDb();
    const inventoryCollection = db.collection<InventoryItem>('inventory');
    
    try {
      const productObjId = new ObjectId(productId);
      
      await inventoryCollection.updateOne(
        { productId: productObjId },
        {
          $inc: { qty: quantity },
          $set: { updatedAt: new Date() },
        },
        { upsert: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error restoring inventory:', error);
      return false;
    }
  }

  /**
   * Set inventory level (create or update)
   */
  async setInventory(
    productId: string,
    qty: number,
    lowStockThreshold: number = 10
  ): Promise<boolean> {
    const db = mongo.getDb();
    const inventoryCollection = db.collection<InventoryItem>('inventory');
    
    try {
      const productObjId = new ObjectId(productId);
      
      await inventoryCollection.updateOne(
        { productId: productObjId },
        {
          $set: {
            productId: productObjId,
            qty,
            lowStockThreshold,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error setting inventory:', error);
      return false;
    }
  }

  /**
   * Adjust inventory (add or subtract)
   */
  async adjustInventory(productId: string, adjustment: number): Promise<boolean> {
    const db = mongo.getDb();
    const inventoryCollection = db.collection<InventoryItem>('inventory');
    
    try {
      const productObjId = new ObjectId(productId);
      
      await inventoryCollection.updateOne(
        { productId: productObjId },
        {
          $inc: { qty: adjustment },
          $set: { updatedAt: new Date() },
        },
        { upsert: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      return false;
    }
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(): Promise<InventoryItem[]> {
    const db = mongo.getDb();
    const inventoryCollection = db.collection<InventoryItem>('inventory');
    
    const items = await inventoryCollection.find({
      $expr: {
        $lte: ['$qty', '$lowStockThreshold'],
      },
    }).toArray();
    
    return items;
  }
}

export const inventoryService = new InventoryService();


/**
 * Cart Controller
 * 
 * Handles cart operations for authenticated and anonymous users.
 */

import { Request, Response } from 'express';
import { cartService } from '../services/CartService';
import { productService } from '../services/ProductService';
import { inventoryService } from '../services/InventoryService';
import { z } from 'zod';

const addItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
});

const updateItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(0),
});

export class CartController {
  /**
   * GET /api/cart
   * Get current cart
   */
  static async getCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      
      const cart = await cartService.getCart(userId, sessionId);
      
      if (!cart || cart.items.length === 0) {
        res.json({
          ok: true,
          data: {
            items: [],
          },
        });
        return;
      }
      
      // Enrich cart items with product details
      const productIds = cart.items.map(item => item.productId);
      const products = await Promise.all(
        productIds.map(id => productService.getProductById(id))
      );
      
      const enrichedItems = cart.items.map(item => {
        const product = products.find(p => p?._id === item.productId);
        const inventory = inventoryService.getInventory(item.productId);
        
        return {
          ...item,
          product: product ? {
            id: product._id,
            name: product.name,
            slug: product.slug,
            images: product.images,
          } : null,
        };
      });
      
      res.json({
        ok: true,
        data: {
          items: enrichedItems,
        },
      });
    } catch (error) {
      console.error('Error getting cart:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch cart',
      });
    }
  }

  /**
   * POST /api/cart/add
   * Add item to cart
   */
  static async addItem(req: Request, res: Response): Promise<void> {
    try {
      const validated = addItemSchema.parse(req.body);
      const userId = req.userId;
      const sessionId = req.sessionId;
      
      // Get product to verify it exists and get price
      const product = await productService.getProductById(validated.productId);
      if (!product) {
        res.status(404).json({
          ok: false,
          error: 'Product not found',
        });
        return;
      }
      
      // Check inventory
      const inventory = await inventoryService.getInventory(validated.productId);
      if (!inventory || inventory.qty < validated.qty) {
        res.status(409).json({
          ok: false,
          error: 'Insufficient inventory',
          availableQty: inventory?.qty || 0,
        });
        return;
      }
      
      const cart = await cartService.addItem(
        userId,
        sessionId,
        validated.productId,
        validated.qty,
        product.price,
        product.name
      );
      
      res.json({
        ok: true,
        data: cart,
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
      
      console.error('Error adding to cart:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to add item to cart',
      });
    }
  }

  /**
   * POST /api/cart/update
   * Update item quantity
   */
  static async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const validated = updateItemSchema.parse(req.body);
      const userId = req.userId;
      const sessionId = req.sessionId;
      
      if (validated.qty === 0) {
        // Remove item
        const cart = await cartService.removeItem(userId, sessionId, validated.productId);
        res.json({
          ok: true,
          data: cart,
        });
        return;
      }
      
      // Check inventory
      const inventory = await inventoryService.getInventory(validated.productId);
      if (!inventory || inventory.qty < validated.qty) {
        res.status(409).json({
          ok: false,
          error: 'Insufficient inventory',
          availableQty: inventory?.qty || 0,
        });
        return;
      }
      
      const cart = await cartService.updateItem(
        userId,
        sessionId,
        validated.productId,
        validated.qty
      );
      
      if (!cart) {
        res.status(404).json({
          ok: false,
          error: 'Cart not found',
        });
        return;
      }
      
      res.json({
        ok: true,
        data: cart,
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
      
      console.error('Error updating cart:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update cart',
      });
    }
  }

  /**
   * POST /api/cart/remove
   * Remove item from cart
   */
  static async removeItem(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.body;
      
      if (!productId) {
        res.status(400).json({
          ok: false,
          error: 'Product ID is required',
        });
        return;
      }
      
      const userId = req.userId;
      const sessionId = req.sessionId;
      
      const cart = await cartService.removeItem(userId, sessionId, productId);
      
      if (!cart) {
        res.status(404).json({
          ok: false,
          error: 'Cart not found',
        });
        return;
      }
      
      res.json({
        ok: true,
        data: cart,
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to remove item from cart',
      });
    }
  }

  /**
   * POST /api/cart/clear
   * Clear entire cart
   */
  static async clearCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const sessionId = req.sessionId;
      
      await cartService.clearCart(userId, sessionId);
      
      res.json({
        ok: true,
        message: 'Cart cleared',
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to clear cart',
      });
    }
  }
}


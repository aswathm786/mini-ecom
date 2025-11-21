/**
 * Wishlist Controller
 * 
 * Handles wishlist operations: add, remove, list, move to cart.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { wishlistService } from '../services/WishlistService';
import { cartService } from '../services/CartService';

const addItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export class WishlistController {
  /**
   * GET /api/wishlist
   * Get user's wishlist with product details
   */
  static async getWishlist(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const items = await wishlistService.getWishlistWithProducts(req.userId);

      res.json({
        ok: true,
        data: {
          items,
          count: items.length,
        },
      });
    } catch (error) {
      console.error('Error getting wishlist:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get wishlist',
      });
    }
  }

  /**
   * POST /api/wishlist/add
   * Add item to wishlist
   */
  static async addItem(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const validated = addItemSchema.parse(req.body);
      const wishlist = await wishlistService.addItem(req.userId, validated.productId);

      res.json({
        ok: true,
        data: wishlist,
        message: 'Item added to wishlist',
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

      console.error('Error adding to wishlist:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to add item to wishlist',
      });
    }
  }

  /**
   * DELETE /api/wishlist/:productId
   * Remove item from wishlist
   */
  static async removeItem(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const { productId } = req.params;

      const wishlist = await wishlistService.removeItem(req.userId, productId);

      res.json({
        ok: true,
        data: wishlist,
        message: 'Item removed from wishlist',
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to remove item from wishlist',
      });
    }
  }

  /**
   * POST /api/wishlist/:productId/move-to-cart
   * Move item from wishlist to cart
   */
  static async moveToCart(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }

      const { productId } = req.params;
      const { qty = 1 } = req.body;

      // Check if item is in wishlist
      const inWishlist = await wishlistService.isInWishlist(req.userId, productId);
      if (!inWishlist) {
        res.status(404).json({
          ok: false,
          error: 'Item not found in wishlist',
        });
        return;
      }

      // Get product to get price
      const { productService } = await import('../services/ProductService');
      const product = await productService.getProductById(productId);
      if (!product) {
        res.status(404).json({
          ok: false,
          error: 'Product not found',
        });
        return;
      }

      // Add to cart
      const cart = await cartService.addItem(
        req.userId,
        req.sessionId,
        productId,
        qty,
        product.price,
        product.name
      );

      // Remove from wishlist
      await wishlistService.removeItem(req.userId, productId);

      res.json({
        ok: true,
        data: {
          cart,
          message: 'Item moved to cart',
        },
      });
    } catch (error) {
      console.error('Error moving to cart:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to move item to cart',
      });
    }
  }

  /**
   * GET /api/wishlist/check/:productId
   * Check if product is in wishlist
   */
  static async checkItem(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.json({
          ok: true,
          data: { inWishlist: false },
        });
        return;
      }

      const { productId } = req.params;
      const inWishlist = await wishlistService.isInWishlist(req.userId, productId);

      res.json({
        ok: true,
        data: { inWishlist },
      });
    } catch (error) {
      console.error('Error checking wishlist:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to check wishlist',
      });
    }
  }
}


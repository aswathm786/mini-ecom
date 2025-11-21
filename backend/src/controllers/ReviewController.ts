/**
 * Review Controller
 * 
 * Handles product review operations.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { reviewService } from '../services/ReviewService';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { settingsService } from '../services/SettingsService';

const createReviewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  title: z.string().max(100).optional(),
  comment: z.string().max(1000).optional(),
});

export class ReviewController {
  /**
   * POST /api/products/:id/reviews
   * Create a review for a product
   */
  static async createReview(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const productIdentifier = req.params.id;
      const validated = createReviewSchema.parse({
        ...req.body,
        productId: productIdentifier, // Will be updated below
      });

      // Check if reviews are enabled
      const reviewsEnabled = await settingsService.isFeatureEnabled('reviews.enabled');
      if (!reviewsEnabled) {
        res.status(403).json({
          ok: false,
          error: 'Reviews are currently disabled for this store',
        });
        return;
      }
      
      // Verify product exists and get product ID
      const db = mongo.getDb();
      const productsCollection = db.collection('products');
      
      let productId: string;
      // Try to find by slug first (if it's not a valid ObjectId)
      if (!ObjectId.isValid(productIdentifier)) {
        const product = await productsCollection.findOne({ slug: productIdentifier });
        if (!product) {
          res.status(404).json({
            ok: false,
            error: 'Product not found',
          });
          return;
        }
        productId = product._id?.toString() || productIdentifier;
      } else {
        // It's a valid ObjectId, verify it exists
        const product = await productsCollection.findOne({ _id: new ObjectId(productIdentifier) });
        if (!product) {
          res.status(404).json({
            ok: false,
            error: 'Product not found',
          });
          return;
        }
        productId = productIdentifier;
      }
      
      // Check if moderation is required
      const requireModeration = await settingsService.isFeatureEnabled('reviews.requireModeration');
      
      const review = await reviewService.createReview({
        productId,
        userId: req.userId,
        rating: validated.rating,
        title: validated.title,
        comment: validated.comment,
        status: requireModeration ? 'pending' : 'approved',
      });
      
      res.status(201).json({
        ok: true,
        message: 'Review submitted successfully. It will be visible after approval.',
        data: review,
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
      
      if (error instanceof Error && error.message.includes('already reviewed')) {
        res.status(400).json({
          ok: false,
          error: error.message,
        });
        return;
      }
      
      console.error('Error creating review:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to create review',
      });
    }
  }

  /**
   * GET /api/products/:id/reviews
   * Get reviews for a product (id can be product ID or slug)
   */
  static async getProductReviews(req: Request, res: Response): Promise<void> {
    try {
      const productIdentifier = req.params.id;
      const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;
      
      // Check if it's a slug or ID by trying to find product
      const db = mongo.getDb();
      const productsCollection = db.collection('products');
      
      let productId: string;
      // Try to find by slug first (if it's not a valid ObjectId)
      if (!ObjectId.isValid(productIdentifier)) {
        const product = await productsCollection.findOne({ slug: productIdentifier });
        if (!product) {
          res.status(404).json({
            ok: false,
            error: 'Product not found',
          });
          return;
        }
        productId = product._id?.toString() || productIdentifier;
      } else {
        // It's a valid ObjectId, use it directly
        productId = productIdentifier;
      }
      
      const result = await reviewService.getProductReviews(productId, {
        status,
        limit,
        skip,
      });
      
      res.json({
        ok: true,
        data: result.reviews,
        total: result.total,
        averageRating: result.averageRating,
      });
    } catch (error) {
      console.error('Error getting reviews:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch reviews',
      });
    }
  }

  /**
   * DELETE /api/reviews/:id
   * Delete a review (user can delete their own, admin can delete any)
   */
  static async deleteReview(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const reviewId = req.params.id;
      const isAdmin = (req.user as any)?.role === 'admin';
      
      // Check if review exists and user owns it (unless admin)
      const review = await reviewService.getReviewById(reviewId);
      if (!review) {
        res.status(404).json({
          ok: false,
          error: 'Review not found',
        });
        return;
      }
      
      if (!isAdmin && review.userId !== req.userId) {
        res.status(403).json({
          ok: false,
          error: 'You can only delete your own reviews',
        });
        return;
      }
      
      const success = await reviewService.deleteReview(reviewId, isAdmin ? undefined : req.userId);
      
      if (!success) {
        res.status(404).json({
          ok: false,
          error: 'Review not found',
        });
        return;
      }
      
      res.json({
        ok: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to delete review',
      });
    }
  }

  /**
   * GET /api/products/:id/reviews/user
   * Get current user's review for a product (id can be product ID or slug)
   */
  static async getUserReview(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          ok: false,
          error: 'Authentication required',
        });
        return;
      }
      
      const productIdentifier = req.params.id;
      
      // Check if it's a slug or ID by trying to find product
      const db = mongo.getDb();
      const productsCollection = db.collection('products');
      
      let productId: string;
      // Try to find by slug first (if it's not a valid ObjectId)
      if (!ObjectId.isValid(productIdentifier)) {
        const product = await productsCollection.findOne({ slug: productIdentifier });
        if (!product) {
          res.status(404).json({
            ok: false,
            error: 'Product not found',
          });
          return;
        }
        productId = product._id?.toString() || productIdentifier;
      } else {
        // It's a valid ObjectId, use it directly
        productId = productIdentifier;
      }
      
      const review = await reviewService.getUserReview(productId, req.userId);
      
      res.json({
        ok: true,
        data: review,
      });
    } catch (error) {
      console.error('Error getting user review:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch review',
      });
    }
  }
}


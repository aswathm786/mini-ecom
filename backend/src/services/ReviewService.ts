/**
 * Review Service
 * 
 * Manages product reviews.
 */

import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { Review } from '../models/Review';
import { sanitizePlainText, sanitizeHtmlContent } from '../helpers/sanitize';

class ReviewService {
  /**
   * Create a new review
   */
  async createReview(data: {
    productId: string;
    userId: string;
    rating: number;
    title?: string;
    comment?: string;
  }): Promise<Review> {
    const db = mongo.getDb();
    const reviewsCollection = db.collection<Review>('reviews');
    
    // Check if user already reviewed this product
    const existing = await reviewsCollection.findOne({
      productId: data.productId,
      userId: data.userId,
    });
    
    if (existing) {
      throw new Error('You have already reviewed this product');
    }
    
    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const review: Review = {
      productId: data.productId,
      userId: data.userId,
      rating: data.rating,
      title: data.title ? sanitizePlainText(data.title) : undefined,
      comment: data.comment ? sanitizeHtmlContent(data.comment) : undefined,
      status: 'pending', // Require admin approval by default
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await reviewsCollection.insertOne(review);
    review._id = result.insertedId.toString();
    
    return review;
  }

  /**
   * Get reviews for a product
   */
  async getProductReviews(
    productId: string,
    options: {
      status?: 'pending' | 'approved' | 'rejected';
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<{ reviews: Review[]; total: number; averageRating: number }> {
    const db = mongo.getDb();
    const reviewsCollection = db.collection<Review>('reviews');
    
    const query: any = { productId };
    
    if (options.status) {
      query.status = options.status;
    } else {
      // Default to approved reviews only
      query.status = 'approved';
    }
    
    const [reviews, total] = await Promise.all([
      reviewsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(options.skip || 0)
        .limit(options.limit || 20)
        .toArray(),
      reviewsCollection.countDocuments(query),
    ]);
    
    // Calculate average rating
    const ratings = reviews.map(r => r.rating);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;
    
    return {
      reviews,
      total,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    };
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: string): Promise<Review | null> {
    const db = mongo.getDb();
    const reviewsCollection = db.collection<Review>('reviews');
    
    try {
      const review = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) });
      return review;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update review status (admin only)
   */
  async updateReviewStatus(
    reviewId: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<boolean> {
    const db = mongo.getDb();
    const reviewsCollection = db.collection<Review>('reviews');
    
    try {
      await reviewsCollection.updateOne(
        { _id: new ObjectId(reviewId) },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );
      return true;
    } catch (error) {
      console.error('Error updating review status:', error);
      return false;
    }
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string, userId?: string): Promise<boolean> {
    const db = mongo.getDb();
    const reviewsCollection = db.collection<Review>('reviews');
    
    try {
      const query: any = { _id: new ObjectId(reviewId) };
      
      // If userId provided, ensure user owns the review (unless admin)
      if (userId) {
        query.userId = userId;
      }
      
      const result = await reviewsCollection.deleteOne(query);
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting review:', error);
      return false;
    }
  }

  /**
   * Get user's review for a product
   */
  async getUserReview(productId: string, userId: string): Promise<Review | null> {
    const db = mongo.getDb();
    const reviewsCollection = db.collection<Review>('reviews');
    
    const review = await reviewsCollection.findOne({
      productId,
      userId,
    });
    
    return review;
  }
}

export const reviewService = new ReviewService();


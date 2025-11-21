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
    status?: 'pending' | 'approved';
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
      status: data.status || 'pending',
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
  ): Promise<{ reviews: any[]; total: number; averageRating: number }> {
    const db = mongo.getDb();
    const reviewsCollection = db.collection<Review>('reviews');
    const usersCollection = db.collection('users');
    
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
    
    // Populate user information for each review
    const reviewsWithUsers = await Promise.all(
      reviews.map(async (review) => {
        const user = await usersCollection.findOne(
          { _id: new ObjectId(review.userId) },
          { projection: { email: 1, firstName: 1, lastName: 1 } }
        );
        
        return {
          ...review,
          user: user ? {
            id: user._id?.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            name: user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : user.firstName || user.lastName || user.email?.split('@')[0] || 'Anonymous',
          } : {
            id: review.userId,
            name: 'Anonymous',
          },
        };
      })
    );
    
    // Calculate average rating
    const ratings = reviews.map(r => r.rating);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;
    
    return {
      reviews: reviewsWithUsers,
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

  /**
   * Add admin reply to a review
   */
  async addAdminReply(
    reviewId: string,
    adminId: string,
    message: string
  ): Promise<boolean> {
    const db = mongo.getDb();
    const reviewsCollection = db.collection<Review>('reviews');
    
    try {
      // Sanitize the admin reply message
      const sanitizedMessage = sanitizeHtmlContent(message);
      
      const result = await reviewsCollection.updateOne(
        { _id: new ObjectId(reviewId) },
        {
          $set: {
            adminReply: {
              message: sanitizedMessage,
              repliedBy: adminId,
              repliedAt: new Date(),
            },
            updatedAt: new Date(),
          },
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error adding admin reply:', error);
      return false;
    }
  }
}

export const reviewService = new ReviewService();


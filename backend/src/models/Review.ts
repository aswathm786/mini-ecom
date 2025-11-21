/**
 * Review Model
 * 
 * Defines the structure for product reviews.
 */

export interface Review {
  _id?: string;
  productId: string;
  userId: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminReply?: {
    message: string;
    repliedBy: string; // Admin user ID
    repliedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}


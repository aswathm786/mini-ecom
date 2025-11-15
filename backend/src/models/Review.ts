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
  createdAt: Date;
  updatedAt: Date;
}


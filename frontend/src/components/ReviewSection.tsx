/**
 * Review Section Component
 * 
 * Displays product reviews with ratings and allows logged-in users to post reviews.
 * Shows admin replies when available.
 */

import { useState, useEffect } from 'react';
import { csrfFetch } from '../lib/csrfFetch';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import { Input } from './Input';

interface Review {
  _id?: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminReply?: {
    message: string;
    repliedBy: string;
    repliedAt: Date | string;
  };
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ReviewSectionProps {
  productId: string;
  productSlug: string;
}

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function StarRating({ rating, onRatingChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  const displayRating = hoverRating || rating;
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRatingChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          disabled={readonly}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <svg
            className={sizeClasses[size]}
            fill={star <= displayRating ? '#fbbf24' : '#e5e7eb'}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function ReviewSection({ productId, productSlug }: ReviewSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  
  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
    if (isAuthenticated) {
      loadUserReview();
    }
  }, [productId, isAuthenticated]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await csrfFetch(`/api/products/${productSlug}/reviews`);
      if (response.ok && response.data) {
        setReviews(response.data.data || []);
        setAverageRating(response.data.averageRating || 0);
        setTotalReviews(response.data.total || 0);
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserReview = async () => {
    try {
      const response = await csrfFetch(`/api/products/${productSlug}/reviews/user`);
      if (response.ok && response.data) {
        setUserReview(response.data.data);
        if (response.data.data) {
          setRating(response.data.data.rating);
          setTitle(response.data.data.title || '');
          setComment(response.data.data.comment || '');
        }
      }
    } catch (err) {
      // User hasn't reviewed yet, that's fine
      console.error('Error loading user review:', err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('Please log in to post a review');
      return;
    }
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    
    if (userReview) {
      setError('You have already reviewed this product');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await csrfFetch(`/api/products/${productSlug}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
        }),
      });
      
      if (response.ok) {
        setSuccess(response.message || 'Review submitted successfully');
        setTitle('');
        setComment('');
        setRating(0);
        setShowForm(false);
        await loadReviews();
        await loadUserReview();
      } else {
        setError(response.error || 'Failed to submit review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="mt-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 border-t border-gray-200 pt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
      
      {/* Rating Summary */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
            <StarRating rating={Math.round(averageRating)} readonly size="sm" />
            <div className="text-sm text-gray-600 mt-1">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</div>
          </div>
          <div className="flex-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter(r => r.rating === star).length;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-600 w-8">{star} star</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review Form (for logged-in users who haven't reviewed) */}
      {isAuthenticated && !userReview && (
        <div className="mb-8">
          {!showForm ? (
            <Button
              variant="primary"
              onClick={() => setShowForm(true)}
            >
              Write a Review
            </Button>
          ) : (
            <form onSubmit={handleSubmitReview} className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                  {success}
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating <span className="text-red-500">*</span>
                </label>
                <StarRating rating={rating} onRatingChange={setRating} />
              </div>
              
              <div className="mb-4">
                <Input
                  label="Title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your review a title"
                  maxLength={100}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this product"
                  rows={4}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {comment.length}/1000 characters
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || rating === 0}
                  isLoading={submitting}
                >
                  Submit Review
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {!isAuthenticated && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            <a href="/login" className="font-medium underline">Log in</a> to write a review
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-semibold text-gray-900">
                      {review.user?.name || 'Anonymous'}
                    </div>
                    <StarRating rating={review.rating} readonly size="sm" />
                  </div>
                  {review.title && (
                    <h4 className="text-lg font-medium text-gray-900 mb-1">{review.title}</h4>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(review.createdAt)}
                </div>
              </div>
              
              {review.comment && (
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{review.comment}</p>
              )}
              
              {/* Admin Reply */}
              {review.adminReply && (
                <div className="ml-4 pl-4 border-l-4 border-primary-500 bg-gray-50 rounded-r-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-primary-600">Admin Reply</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(review.adminReply.repliedAt)}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{review.adminReply.message}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


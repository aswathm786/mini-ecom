/**
 * Catalog Routes
 * 
 * Public routes for categories and products.
 */

import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { ProductController } from '../controllers/ProductController';
import { ReviewController } from '../controllers/ReviewController';
import { requireAuth } from '../middleware/Auth';
import { csrfProtection } from '../middleware/CSRF';

const router = Router();

// Categories
router.get('/categories', CategoryController.list);
router.get('/categories/:slug', CategoryController.getBySlug);

// Products
router.get('/products', ProductController.list);
router.get('/products/:slug', ProductController.getBySlug);

// Product Reviews
router.get('/products/:id/reviews', ReviewController.getProductReviews);
router.get('/products/:id/reviews/user', requireAuth, ReviewController.getUserReview);
router.post('/products/:id/reviews', requireAuth, csrfProtection, ReviewController.createReview);
router.delete('/reviews/:id', requireAuth, csrfProtection, ReviewController.deleteReview);

export default router;


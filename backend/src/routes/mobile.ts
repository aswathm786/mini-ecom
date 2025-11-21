/**
 * Mobile API Routes
 * 
 * Optimized endpoints for mobile applications with compact JSON responses.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/Auth';
import { csrfProtection } from '../middleware/CSRF';
import { CartController } from '../controllers/CartController';
import { OrderController } from '../controllers/OrderController';
import { WishlistController } from '../controllers/WishlistController';
import { LoyaltyController } from '../controllers/LoyaltyController';
import { ProductController } from '../controllers/ProductController';
import { UserController } from '../controllers/UserController';
import { WebPushController } from '../controllers/WebPushController';

const router = Router();

// All mobile routes require authentication
router.use(requireAuth);

// Products (compact format)
router.get('/products', ProductController.list);
router.get('/products/:slug', ProductController.getBySlug);

// Cart
router.get('/cart', CartController.getCart);
router.post('/cart/add', csrfProtection, CartController.addItem);
router.post('/cart/update', csrfProtection, CartController.updateItem);
router.post('/cart/remove', csrfProtection, CartController.removeItem);

// Orders
router.get('/orders', OrderController.listOrders);
router.get('/orders/:id', OrderController.getOrder);

// Wishlist
router.get('/wishlist', WishlistController.getWishlist);
router.post('/wishlist/add', csrfProtection, WishlistController.addItem);
router.delete('/wishlist/:productId', csrfProtection, WishlistController.removeItem);

// Loyalty
router.get('/loyalty/balance', LoyaltyController.getBalance);
router.get('/loyalty/transactions', LoyaltyController.getTransactions);

// User profile
router.get('/profile', UserController.getProfile);
router.put('/profile', csrfProtection, UserController.updateProfile);

// Push notifications
router.post('/push/subscribe', WebPushController.subscribe);
router.post('/push/unsubscribe', WebPushController.unsubscribe);

export default router;


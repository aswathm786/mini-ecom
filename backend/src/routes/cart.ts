/**
 * Cart Routes
 * 
 * Cart management routes (require authentication).
 */

import { Router } from 'express';
import { CartController } from '../controllers/CartController';
import { requireAuth } from '../middleware/Auth';
import { csrfProtection } from '../middleware/CSRF';

const router = Router();

// All cart routes require authentication
// Users must be logged in to add items to cart
// All routes require CSRF protection

router.get('/cart', requireAuth, CartController.getCart);
router.post('/cart/add', requireAuth, csrfProtection, CartController.addItem);
router.post('/cart/update', requireAuth, csrfProtection, CartController.updateItem);
router.post('/cart/remove', requireAuth, csrfProtection, CartController.removeItem);
router.post('/cart/clear', requireAuth, csrfProtection, CartController.clearCart);

export default router;


/**
 * Cart Routes
 * 
 * Cart management routes (require authentication or session).
 */

import { Router } from 'express';
import { CartController } from '../controllers/CartController';
import { requireAuth } from '../middleware/Auth';
import { csrfProtection } from '../middleware/CSRF';

const router = Router();

// All cart routes require CSRF protection
// Note: requireAuth is optional - anonymous users can have carts via sessionId
// For now, we'll make cart accessible to all (session-based)
// In production, you might want to require auth for cart persistence

router.get('/cart', CartController.getCart);
router.post('/cart/add', csrfProtection, CartController.addItem);
router.post('/cart/update', csrfProtection, CartController.updateItem);
router.post('/cart/remove', csrfProtection, CartController.removeItem);
router.post('/cart/clear', csrfProtection, CartController.clearCart);

export default router;


/**
 * Order Routes
 * 
 * Order creation and retrieval routes.
 */

import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { requireAuth } from '../middleware/Auth';
import { csrfProtection } from '../middleware/CSRF';

const router = Router();

// Multi-step checkout endpoints (require authentication and CSRF)
router.post('/checkout/create-order', requireAuth, csrfProtection, OrderController.createOrder);
router.post('/checkout/create-razorpay-order', requireAuth, csrfProtection, OrderController.createRazorpayOrder);
router.post('/checkout/confirm-razorpay', requireAuth, csrfProtection, OrderController.confirmPayment);

// Legacy checkout endpoint (kept for backward compatibility)
router.post('/checkout', requireAuth, csrfProtection, OrderController.checkout);

// Order details - require auth (user can only see their own orders, admin can see all)
router.get('/orders/:id', requireAuth, OrderController.getOrder);

export default router;


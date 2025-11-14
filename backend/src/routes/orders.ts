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

// Checkout requires authentication and CSRF
router.post('/checkout', requireAuth, csrfProtection, OrderController.checkout);

// Order details - require auth (user can only see their own orders, admin can see all)
router.get('/orders/:id', requireAuth, OrderController.getOrder);

export default router;


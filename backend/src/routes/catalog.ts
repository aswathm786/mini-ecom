/**
 * Catalog Routes
 * 
 * Public routes for categories and products.
 */

import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { ProductController } from '../controllers/ProductController';

const router = Router();

// Categories
router.get('/categories', CategoryController.list);
router.get('/categories/:slug', CategoryController.getBySlug);

// Products
router.get('/products', ProductController.list);
router.get('/products/:slug', ProductController.getBySlug);

export default router;


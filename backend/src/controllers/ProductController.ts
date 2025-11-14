/**
 * Product Controller
 * 
 * Handles product listing and detail endpoints (public).
 */

import { Request, Response } from 'express';
import { productService } from '../services/ProductService';
import { inventoryService } from '../services/InventoryService';
import { parsePagination, getPaginationMeta } from '../helpers/pagination';

export class ProductController {
  /**
   * GET /api/products
   * List products with search, filters, and pagination
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const pagination = parsePagination(req.query);
      
      const filters = {
        q: req.query.q as string | undefined,
        categoryId: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
        ...pagination,
      };
      
      const { products, total } = await productService.listProducts(filters);
      
      // Get inventory for products
      const productIds = products.map(p => p._id!);
      const inventoryMap = await inventoryService.getInventoryForProducts(productIds);
      
      // Attach inventory info to products
      const productsWithInventory = products.map(product => ({
        ...product,
        inventory: inventoryMap.get(product._id!) || null,
      }));
      
      res.json({
        ok: true,
        data: productsWithInventory,
        meta: getPaginationMeta(pagination, total),
      });
    } catch (error) {
      console.error('Error listing products:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch products',
      });
    }
  }

  /**
   * GET /api/products/:slug
   * Get single product by slug with inventory
   */
  static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.getProductBySlug(req.params.slug);
      
      if (!product) {
        res.status(404).json({
          ok: false,
          error: 'Product not found',
        });
        return;
      }
      
      // Get inventory
      const inventory = await inventoryService.getInventory(product._id!);
      
      res.json({
        ok: true,
        data: {
          ...product,
          inventory: inventory || null,
        },
      });
    } catch (error) {
      console.error('Error getting product:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch product',
      });
    }
  }
}


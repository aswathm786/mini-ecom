/**
 * Product Controller
 * 
 * Handles product listing and detail endpoints (public).
 */

import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { productService } from '../services/ProductService';
import { inventoryService } from '../services/InventoryService';
import { parsePagination, getPaginationMeta } from '../helpers/pagination';
import { mongo } from '../db/Mongo';

export class ProductController {
  /**
   * GET /api/products
   * List products with search, filters, and pagination
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const pagination = parsePagination(req.query);
      
      // Handle category filter - can be slug or categoryId, and can be multiple
      let categoryIds: string[] | undefined = undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const categorySlugs = req.query.category ? (Array.isArray(req.query.category) ? req.query.category : [req.query.category]) as string[] : [];
      
      const db = mongo.getDb();
      const categoriesCollection = db.collection('categories');
      
      // If category slugs are provided, look up the category IDs
      if (categorySlugs.length > 0) {
        const validObjectIds: ObjectId[] = [];
        const slugs: string[] = [];
        
        // Separate slugs from ObjectIds
        categorySlugs.forEach(slugOrId => {
          if (ObjectId.isValid(slugOrId)) {
            try {
              validObjectIds.push(new ObjectId(slugOrId));
            } catch (e) {
              // Not a valid ObjectId, treat as slug
              slugs.push(slugOrId);
            }
          } else {
            slugs.push(slugOrId);
          }
        });
        
        const queryConditions: any[] = [];
        if (slugs.length > 0) {
          queryConditions.push({ slug: { $in: slugs } });
        }
        if (validObjectIds.length > 0) {
          queryConditions.push({ _id: { $in: validObjectIds } });
        }
        
        if (queryConditions.length > 0) {
          const categories = await categoriesCollection.find({ 
            $or: queryConditions
          }).toArray();
          categoryIds = categories.map(c => c._id?.toString()).filter(Boolean) as string[];
        }
      } else if (categoryId) {
        // Legacy single category support
        const query: any = {};
        if (ObjectId.isValid(categoryId)) {
          query._id = new ObjectId(categoryId);
        } else {
          query.slug = categoryId;
        }
        
        const category = await categoriesCollection.findOne(query);
        if (category) {
          categoryIds = [category._id?.toString()].filter(Boolean) as string[];
        }
      }
      
      const filters = {
        q: req.query.q as string | undefined,
        categoryIds,
        status: req.query.status as string | undefined,
        ...pagination,
      };
      
      const { products, total } = await productService.listProducts(filters);
      
      // Get inventory for products
      const productIds = products.map(p => {
        const id = p._id instanceof ObjectId ? p._id.toString() : p._id;
        return id!;
      });
      const inventoryMap = await inventoryService.getInventoryForProducts(productIds);
      
      // Attach inventory info to products
      const productsWithInventory = products.map(product => {
        const productId = product._id instanceof ObjectId ? product._id.toString() : product._id;
        return {
          ...product,
          inventory: inventoryMap.get(productId!) || null,
        };
      });
      
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
      const productId = product._id instanceof ObjectId ? product._id.toString() : product._id;
      const inventory = await inventoryService.getInventory(productId!);
      
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


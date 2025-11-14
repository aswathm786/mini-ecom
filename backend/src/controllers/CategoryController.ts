/**
 * Category Controller
 * 
 * Handles category listing and retrieval endpoints.
 */

import { Request, Response } from 'express';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';

export interface Category {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  createdAt: Date;
}

export class CategoryController {
  /**
   * GET /api/categories
   * List all categories (optionally filtered by parent)
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const categoriesCollection = db.collection<Category>('categories');
      
      const query: any = {};
      
      // Filter by parent if provided
      if (req.query.parent) {
        if (req.query.parent === 'null' || req.query.parent === '') {
          query.parentId = { $exists: false };
        } else {
          query.parentId = req.query.parent;
        }
      }
      
      const categories = await categoriesCollection
        .find(query)
        .sort({ sortOrder: 1, name: 1 })
        .toArray();
      
      res.json({
        ok: true,
        data: categories,
      });
    } catch (error) {
      console.error('Error listing categories:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch categories',
      });
    }
  }

  /**
   * GET /api/categories/:slug
   * Get a single category by slug
   */
  static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const categoriesCollection = db.collection<Category>('categories');
      
      const category = await categoriesCollection.findOne({
        slug: req.params.slug,
      });
      
      if (!category) {
        res.status(404).json({
          ok: false,
          error: 'Category not found',
        });
        return;
      }
      
      res.json({
        ok: true,
        data: category,
      });
    } catch (error) {
      console.error('Error getting category:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch category',
      });
    }
  }
}


import { Request, Response } from 'express';
import { productService } from '../services/ProductService';
import { inventoryService } from '../services/InventoryService';
import { parsePagination } from '../helpers/pagination';

export class AdminProductController {
  /**
   * GET /api/admin/products
   * List products for admin dashboard with filters
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const pagination = parsePagination(req.query);
      const search = (req.query.search as string) || (req.query.q as string) || undefined;
      const categoryId = (req.query.category as string) || (req.query.categoryId as string) || undefined;
      const status = (req.query.status as string | undefined) || 'all';

      const { products, total } = await productService.listProducts({
        q: search,
        categoryId,
        status,
        page: pagination.page,
        limit: pagination.limit,
        skip: pagination.skip,
      });

      const productIds = products
        .map((product) => product._id?.toString())
        .filter((id): id is string => Boolean(id));

      const inventoryMap =
        productIds.length > 0 ? await inventoryService.getInventoryForProducts(productIds) : new Map();

      const items = products.map((product) => {
        const id = product._id?.toString();
        const inventory = id ? inventoryMap.get(id) : undefined;
        return {
          ...product,
          stock: inventory?.qty ?? 0,
          lowStockThreshold: inventory?.lowStockThreshold ?? 0,
        };
      });

      res.json({
        ok: true,
        data: {
          items,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      console.error('Error listing admin products:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch products',
      });
    }
  }
}



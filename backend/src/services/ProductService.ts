/**
 * Product Service
 * 
 * Business logic for product management, including image handling.
 */

import { Db, ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';
import { generateSlug, sanitizeString } from '../helpers/validate';
import { sanitizePlainText, sanitizeHtmlContent } from '../helpers/sanitize';
import { getFileUrl } from '../middleware/Upload';

export interface ProductImage {
  filename: string;
  url: string;
  alt?: string;
}

export interface Product {
  _id?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  sku?: string;
  status: 'active' | 'inactive' | 'draft';
  categoryId?: string;
  images: ProductImage[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  createdAt: Date;
  updatedAt: Date;
}

class ProductService {
  /**
   * Create a new product
   */
  async createProduct(data: {
    name: string;
    description: string;
    price: number;
    sku?: string;
    categoryId?: string;
    status?: 'active' | 'inactive' | 'draft';
    images?: Express.Multer.File[];
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
  }): Promise<Product> {
    const db = mongo.getDb();
    const productsCollection = db.collection<Product>('products');
    
    const slug = generateSlug(data.name);
    
    // Check if slug already exists
    const existing = await productsCollection.findOne({ slug });
    if (existing) {
      throw new Error('Product with this name already exists');
    }
    
    // Process images
    const images: ProductImage[] = (data.images || []).map(file => ({
      filename: file.filename,
      url: getFileUrl(file.filename),
      alt: data.name,
    }));
    
    const product: Product = {
      name: sanitizePlainText(data.name),
      slug,
      description: sanitizeHtmlContent(data.description),
      price: data.price,
      sku: data.sku || undefined,
      status: data.status || 'active',
      categoryId: data.categoryId ? new ObjectId(data.categoryId).toString() : undefined,
      images,
      metaTitle: data.metaTitle ? sanitizePlainText(data.metaTitle) : undefined,
      metaDescription: data.metaDescription ? sanitizePlainText(data.metaDescription) : undefined,
      metaKeywords: data.metaKeywords ? sanitizePlainText(data.metaKeywords) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await productsCollection.insertOne(product);
    product._id = result.insertedId.toString();
    
    return product;
  }

  /**
   * Update a product
   */
  async updateProduct(
    productId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      sku?: string;
      categoryId?: string;
      status?: 'active' | 'inactive' | 'draft';
      images?: Express.Multer.File[];
      removeImages?: string[]; // Filenames to remove
      metaTitle?: string;
      metaDescription?: string;
      metaKeywords?: string;
    }
  ): Promise<Product | null> {
    const db = mongo.getDb();
    const productsCollection = db.collection<Product>('products');
    
    try {
      const productObjId = new ObjectId(productId);
      const existing = await productsCollection.findOne({ _id: productObjId });
      
      if (!existing) {
        return null;
      }
      
      const update: Partial<Product> = {
        updatedAt: new Date(),
      };
      
      if (data.name !== undefined) {
        update.name = sanitizePlainText(data.name);
        update.slug = generateSlug(data.name);
      }
      if (data.description !== undefined) {
        update.description = sanitizeHtmlContent(data.description);
      }
      if (data.price !== undefined) {
        update.price = data.price;
      }
      if (data.sku !== undefined) {
        update.sku = data.sku;
      }
      if (data.categoryId !== undefined) {
        update.categoryId = data.categoryId ? new ObjectId(data.categoryId).toString() : undefined;
      }
      if (data.status !== undefined) {
        update.status = data.status;
      }
      if (data.metaTitle !== undefined) {
        update.metaTitle = data.metaTitle ? sanitizePlainText(data.metaTitle) : undefined;
      }
      if (data.metaDescription !== undefined) {
        update.metaDescription = data.metaDescription ? sanitizePlainText(data.metaDescription) : undefined;
      }
      if (data.metaKeywords !== undefined) {
        update.metaKeywords = data.metaKeywords ? sanitizePlainText(data.metaKeywords) : undefined;
      }
      
      // Handle images
      let images = [...existing.images];
      
      // Remove specified images
      if (data.removeImages && data.removeImages.length > 0) {
        images = images.filter(img => !data.removeImages!.includes(img.filename));
      }
      
      // Add new images
      if (data.images && data.images.length > 0) {
        const newImages = data.images.map(file => ({
          filename: file.filename,
          url: getFileUrl(file.filename),
          alt: update.name || existing.name,
        }));
        images.push(...newImages);
      }
      
      update.images = images;
      
      await productsCollection.updateOne(
        { _id: productObjId },
        { $set: update }
      );
      
      const updated = await productsCollection.findOne({ _id: productObjId });
      return updated;
    } catch (error) {
      console.error('Error updating product:', error);
      return null;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    const db = mongo.getDb();
    const productsCollection = db.collection<Product>('products');
    
    try {
      const productObjId = new ObjectId(productId);
      const product = await productsCollection.findOne({ _id: productObjId });
      return product;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    const db = mongo.getDb();
    const productsCollection = db.collection<Product>('products');
    
    const product = await productsCollection.findOne({ slug, status: 'active' });
    return product;
  }

  /**
   * List products with filters and pagination
   */
  async listProducts(filters: {
    q?: string;
    categoryId?: string;
    status?: string;
    page: number;
    limit: number;
    skip: number;
  }): Promise<{ products: Product[]; total: number }> {
    const db = mongo.getDb();
    const productsCollection = db.collection<Product>('products');
    
    const query: any = {};
    
    // Search query
    if (filters.q) {
      query.$or = [
        { name: { $regex: filters.q, $options: 'i' } },
        { description: { $regex: filters.q, $options: 'i' } },
        { sku: { $regex: filters.q, $options: 'i' } },
      ];
    }
    
    // Category filter
    if (filters.categoryId) {
      query.categoryId = filters.categoryId;
    }
    
    // Status filter (default to active for public)
    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = 'active';
    }
    
    const [products, total] = await Promise.all([
      productsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(filters.skip)
        .limit(filters.limit)
        .toArray(),
      productsCollection.countDocuments(query),
    ]);
    
    return { products, total };
  }

  /**
   * Delete a product (soft delete by setting status to inactive)
   */
  async deleteProduct(productId: string, hardDelete: boolean = false): Promise<boolean> {
    const db = mongo.getDb();
    const productsCollection = db.collection<Product>('products');
    
    try {
      const productObjId = new ObjectId(productId);
      
      if (hardDelete) {
        await productsCollection.deleteOne({ _id: productObjId });
      } else {
        // Soft delete
        await productsCollection.updateOne(
          { _id: productObjId },
          { $set: { status: 'inactive', updatedAt: new Date() } }
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }
}

export const productService = new ProductService();


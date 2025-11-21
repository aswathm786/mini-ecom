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

export interface ProductFAQ {
  question: string;
  answer: string;
}

export interface Product {
  _id?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  sku?: string;
  status: 'active' | 'inactive' | 'draft';
  categoryId?: string; // Legacy field for backward compatibility
  categoryIds?: string[]; // New field for multiple categories
  images: ProductImage[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  faq?: ProductFAQ[]; // Product FAQs
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
    categoryId?: string; // Legacy support
    categoryIds?: string[]; // New multi-category support
    status?: 'active' | 'inactive' | 'draft';
    images?: Express.Multer.File[];
    imageUrls?: string[]; // Support image URLs in addition to file uploads
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    faq?: ProductFAQ[]; // Product FAQs
  }): Promise<Product> {
    const db = mongo.getDb();
    const productsCollection = db.collection<Product>('products');
    
    const slug = generateSlug(data.name);
    
    // Check if slug already exists
    const existing = await productsCollection.findOne({ slug });
    if (existing) {
      throw new Error('Product with this name already exists');
    }
    
    // Process images from file uploads
    const fileImages: ProductImage[] = (data.images || []).map(file => ({
      filename: file.filename,
      url: getFileUrl(file.filename),
      alt: data.name,
    }));
    
    // Process images from URLs
    const urlImages: ProductImage[] = (data.imageUrls || []).map(url => ({
      filename: url, // Use URL as filename identifier
      url: url,
      alt: data.name,
    }));
    
    const images = [...fileImages, ...urlImages];
    
    // Handle categories: support both categoryId (legacy) and categoryIds (new)
    let categoryIds: string[] | undefined;
    if (data.categoryIds && data.categoryIds.length > 0) {
      categoryIds = data.categoryIds.map(id => new ObjectId(id).toString());
    } else if (data.categoryId) {
      // Migrate single categoryId to categoryIds array for backward compatibility
      categoryIds = [new ObjectId(data.categoryId).toString()];
    }
    
    const product: Product = {
      name: sanitizePlainText(data.name),
      slug,
      description: sanitizeHtmlContent(data.description),
      price: data.price,
      sku: data.sku || undefined,
      status: data.status || 'active',
      categoryId: data.categoryId ? new ObjectId(data.categoryId).toString() : undefined, // Keep for backward compatibility
      categoryIds,
      images,
      metaTitle: data.metaTitle ? sanitizePlainText(data.metaTitle) : undefined,
      metaDescription: data.metaDescription ? sanitizePlainText(data.metaDescription) : undefined,
      metaKeywords: data.metaKeywords ? sanitizePlainText(data.metaKeywords) : undefined,
      faq: data.faq && data.faq.length > 0 ? data.faq.map(item => ({
        question: sanitizePlainText(item.question),
        answer: sanitizeHtmlContent(item.answer),
      })) : undefined,
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
      categoryId?: string; // Legacy support
      categoryIds?: string[]; // New multi-category support
      status?: 'active' | 'inactive' | 'draft';
      images?: Express.Multer.File[];
      imageUrls?: string[]; // Support image URLs
      removeImages?: string[]; // Filenames/URLs to remove
      metaTitle?: string;
      metaDescription?: string;
      metaKeywords?: string;
      faq?: ProductFAQ[]; // Product FAQs
    }
  ): Promise<Product | null> {
    const db = mongo.getDb();
    const productsCollection = db.collection<Product>('products');
    
    try {
      const productObjId = new ObjectId(productId);
      const existing = await productsCollection.findOne({ _id: productObjId } as any);
      
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
      // Handle categories: support both categoryId (legacy) and categoryIds (new)
      if (data.categoryIds !== undefined) {
        if (data.categoryIds.length > 0) {
          update.categoryIds = data.categoryIds.map(id => new ObjectId(id).toString());
          // Also set categoryId for backward compatibility (use first category)
          update.categoryId = update.categoryIds[0];
        } else {
          update.categoryIds = undefined;
          update.categoryId = undefined;
        }
      } else if (data.categoryId !== undefined) {
        // Legacy support: migrate single categoryId to categoryIds array
        if (data.categoryId) {
          const categoryIdStr = new ObjectId(data.categoryId).toString();
          update.categoryIds = [categoryIdStr];
          update.categoryId = categoryIdStr;
        } else {
          update.categoryIds = undefined;
          update.categoryId = undefined;
        }
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
      if (data.faq !== undefined) {
        update.faq = data.faq && data.faq.length > 0 ? data.faq.map(item => ({
          question: sanitizePlainText(item.question),
          answer: sanitizeHtmlContent(item.answer),
        })) : undefined;
      }
      
      // Handle images
      let images = [...existing.images];
      
      // Remove specified images (by filename or URL)
      if (data.removeImages && data.removeImages.length > 0) {
        images = images.filter(img => 
          !data.removeImages!.includes(img.filename) && 
          !data.removeImages!.includes(img.url)
        );
      }
      
      // Add new images from file uploads
      if (data.images && data.images.length > 0) {
        const newImages = data.images.map(file => ({
          filename: file.filename,
          url: getFileUrl(file.filename),
          alt: update.name || existing.name,
        }));
        images.push(...newImages);
      }
      
      // Add new images from URLs
      if (data.imageUrls && data.imageUrls.length > 0) {
        const newUrlImages = data.imageUrls.map(url => ({
          filename: url, // Use URL as filename identifier
          url: url,
          alt: update.name || existing.name,
        }));
        images.push(...newUrlImages);
      }
      
      update.images = images;
      
      await productsCollection.updateOne(
        { _id: productObjId } as any,
        { $set: update }
      );
      
      const updated = await productsCollection.findOne({ _id: productObjId } as any);
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
      const product = await productsCollection.findOne({ _id: productObjId } as any);
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
    categoryId?: string; // Legacy single category support
    categoryIds?: string[]; // Multiple categories support
    status?: string;
    page: number;
    limit: number;
    skip: number;
  }): Promise<{ products: Product[]; total: number }> {
    const db = mongo.getDb();
    const productsCollection = db.collection<Product>('products');
    
    const query: any = {};
    const andConditions: any[] = [];
    
    // Search query
    if (filters.q) {
      andConditions.push({
        $or: [
          { name: { $regex: filters.q, $options: 'i' } },
          { description: { $regex: filters.q, $options: 'i' } },
          { sku: { $regex: filters.q, $options: 'i' } },
        ],
      });
    }
    
    // Category filter - support multiple categories
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      andConditions.push({
        $or: [
          { categoryId: { $in: filters.categoryIds } },
          { categoryIds: { $in: filters.categoryIds } },
        ],
      });
    } else if (filters.categoryId) {
      // Legacy single category support
      andConditions.push({
        $or: [
          { categoryId: filters.categoryId },
          { categoryIds: filters.categoryId },
        ],
      });
    }
    
    // Combine conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }
    
    // Status filter (default to active unless explicitly requesting all)
    if (filters.status === undefined) {
      query.status = 'active';
    } else if (filters.status !== 'all') {
      query.status = filters.status;
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
        await productsCollection.deleteOne({ _id: productObjId } as any);
      } else {
        // Soft delete
        await productsCollection.updateOne(
          { _id: productObjId } as any,
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


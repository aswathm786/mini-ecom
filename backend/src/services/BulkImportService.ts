/**
 * Bulk Product Import Service
 * 
 * Handles CSV import of products with validation and error reporting.
 */

import { parse } from 'csv-parse/sync';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { productService } from './ProductService';
import { inventoryService } from './InventoryService';

export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    product: string;
    error: string;
  }>;
}

interface CSVProductRow {
  name: string;
  description?: string;
  price: string;
  compareAtPrice?: string;
  sku?: string;
  category?: string;
  stock?: string;
  images?: string; // Comma-separated URLs
  tags?: string; // Comma-separated
  status?: string; // active/inactive
  featured?: string; // true/false
}

class BulkImportService {
  /**
   * Parse CSV file content
   */
  private parseCSV(csvContent: string): CSVProductRow[] {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      return records;
    } catch (error) {
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate product row
   */
  private validateRow(row: CSVProductRow, rowNumber: number): { valid: boolean; error?: string } {
    if (!row.name || row.name.trim() === '') {
      return { valid: false, error: 'Product name is required' };
    }

    if (!row.price || isNaN(parseFloat(row.price))) {
      return { valid: false, error: 'Valid price is required' };
    }

    const price = parseFloat(row.price);
    if (price < 0) {
      return { valid: false, error: 'Price must be positive' };
    }

    if (row.compareAtPrice && isNaN(parseFloat(row.compareAtPrice))) {
      return { valid: false, error: 'Invalid compare at price' };
    }

    if (row.stock && isNaN(parseInt(row.stock))) {
      return { valid: false, error: 'Invalid stock quantity' };
    }

    return { valid: true };
  }

  /**
   * Import products from CSV
   */
  async importProducts(
    csvContent: string,
    adminId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      total: 0,
      imported: 0,
      failed: 0,
      errors: [],
    };

    try {
      const rows = this.parseCSV(csvContent);
      result.total = rows.length;

      const db = mongo.getDb();
      const productsCollection = db.collection('products');
      const categoriesCollection = db.collection('categories');
      const inventoryCollection = db.collection('inventory');

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

        // Validate row
        const validation = this.validateRow(row, rowNumber);
        if (!validation.valid) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            product: row.name || 'Unknown',
            error: validation.error || 'Validation failed',
          });
          continue;
        }

        try {
          // Parse values
          const price = parseFloat(row.price);
          const compareAtPrice = row.compareAtPrice ? parseFloat(row.compareAtPrice) : undefined;
          const stock = row.stock ? parseInt(row.stock) : 0;
          const status = row.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active';
          const featured = row.featured?.toLowerCase() === 'true';

          // Handle category
          let categoryId: string | undefined;
          if (row.category) {
            const category = await categoriesCollection.findOne({
              name: { $regex: new RegExp(`^${row.category}$`, 'i') },
            });

            if (category) {
              categoryId = category._id.toString();
            } else {
              // Create category if it doesn't exist
              const newCategory = await categoriesCollection.insertOne({
                name: row.category,
                slug: row.category.toLowerCase().replace(/\s+/g, '-'),
                description: '',
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              categoryId = newCategory.insertedId.toString();
            }
          }

          // Parse images
          const images: string[] = [];
          if (row.images) {
            images.push(...row.images.split(',').map((url) => url.trim()).filter(Boolean));
          }

          // Parse tags
          const tags: string[] = [];
          if (row.tags) {
            tags.push(...row.tags.split(',').map((tag) => tag.trim()).filter(Boolean));
          }

          // Generate slug
          const slug = row.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          // Check if product with same SKU or slug exists
          const existingQuery: any = {};
          if (row.sku) {
            existingQuery.sku = row.sku;
          } else {
            existingQuery.slug = slug;
          }

          const existing = await productsCollection.findOne(existingQuery);

          if (existing) {
            // Update existing product
            await productsCollection.updateOne(
              { _id: existing._id },
              {
                $set: {
                  name: row.name,
                  description: row.description || existing.description || '',
                  price,
                  compareAtPrice: compareAtPrice || existing.compareAtPrice,
                  sku: row.sku || existing.sku,
                  categoryId: categoryId || existing.categoryId,
                  images: images.length > 0 ? images : existing.images,
                  tags: tags.length > 0 ? tags : existing.tags,
                  status,
                  featured,
                  updatedAt: new Date(),
                },
              }
            );

            // Update inventory
            if (row.stock !== undefined) {
              await inventoryCollection.updateOne(
                { productId: existing._id },
                {
                  $set: {
                    qty: stock,
                    updatedAt: new Date(),
                  },
                },
                { upsert: true }
              );
            }
          } else {
            // Create new product
            const newProduct = await productsCollection.insertOne({
              name: row.name,
              description: row.description || '',
              price,
              compareAtPrice,
              sku: row.sku || undefined,
              slug,
              categoryId,
              images,
              tags,
              status,
              featured,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Create inventory
            await inventoryCollection.insertOne({
              productId: newProduct.insertedId,
              qty: stock,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          result.imported++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            product: row.name || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      if (result.failed > 0) {
        result.success = false;
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        row: 0,
        product: 'CSV',
        error: error instanceof Error ? error.message : 'Failed to process CSV',
      });
      return result;
    }
  }

  /**
   * Generate CSV template
   */
  generateTemplate(): string {
    return `name,description,price,compareAtPrice,sku,category,stock,images,tags,status,featured
Sample Product,This is a sample product description,999.99,1299.99,SKU-001,Electronics,100,https://example.com/image1.jpg,tag1,tag2,active,true
Another Product,Another product description,499.99,,SKU-002,Clothing,50,https://example.com/image2.jpg,tag3,active,false`;
  }
}

export const bulkImportService = new BulkImportService();


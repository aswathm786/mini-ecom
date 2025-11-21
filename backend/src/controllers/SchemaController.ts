/**
 * Database Schema Controller
 * 
 * Handles database schema inspection and management.
 */

import { Request, Response } from 'express';
import { mongo } from '../db/Mongo';
import { Db } from 'mongodb';

interface CollectionInfo {
  name: string;
  count: number;
  size: number;
  indexes: Array<{
    name: string;
    keys: Record<string, number>;
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
  }>;
}

interface IndexDefinition {
  keys: Record<string, 1 | -1 | 'text'>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    name?: string;
    partialFilterExpression?: Record<string, any>;
    expireAfterSeconds?: number;
  };
}

interface CollectionSchema {
  name: string;
  indexes: IndexDefinition[];
}

export class SchemaController {
  /**
   * GET /api/admin/schema
   * Get database schema information
   */
  static async getSchema(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const collections = await db.listCollections().toArray();
      
      const schemaInfo: CollectionInfo[] = [];
      
      for (const collection of collections) {
        const collectionName = collection.name;
        const coll = db.collection(collectionName);
        
        // Get document count
        const count = await coll.countDocuments();
        
        // Get collection stats
        const stats = await db.command({ collStats: collectionName });
        const size = stats.size || 0;
        
        // Get indexes
        const indexes = await coll.indexes();
        const indexInfo = indexes.map((idx: any) => ({
          name: idx.name,
          keys: idx.key,
          unique: idx.unique || false,
          sparse: idx.sparse || false,
          expireAfterSeconds: idx.expireAfterSeconds,
        }));
        
        schemaInfo.push({
          name: collectionName,
          count,
          size,
          indexes: indexInfo,
        });
      }
      
      // Sort by name
      schemaInfo.sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({
        ok: true,
        data: schemaInfo,
      });
    } catch (error) {
      console.error('Error fetching schema:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch schema information',
      });
    }
  }

  /**
   * GET /api/admin/schema/:collection
   * Get detailed information about a specific collection
   */
  static async getCollectionDetails(req: Request, res: Response): Promise<void> {
    try {
      const { collection } = req.params;
      const db = mongo.getDb();
      const coll = db.collection(collection);
      
      // Get collection stats
      const stats = await db.command({ collStats: collection });
      
      // Get indexes
      const indexes = await coll.indexes();
      
      // Get sample documents (first 5)
      const sampleDocs = await coll.find({}).limit(5).toArray();
      
      // Get field types from sample
      const fieldTypes: Record<string, string> = {};
      sampleDocs.forEach((doc: any) => {
        Object.keys(doc).forEach((key) => {
          if (key !== '_id') {
            const value = doc[key];
            const type = Array.isArray(value) ? 'array' : typeof value;
            if (!fieldTypes[key] || fieldTypes[key] === 'undefined') {
              fieldTypes[key] = type;
            }
          }
        });
      });
      
      res.json({
        ok: true,
        data: {
          name: collection,
          count: stats.count || 0,
          size: stats.size || 0,
          storageSize: stats.storageSize || 0,
          indexes: indexes.map((idx: any) => ({
            name: idx.name,
            keys: idx.key,
            unique: idx.unique || false,
            sparse: idx.sparse || false,
            expireAfterSeconds: idx.expireAfterSeconds,
            background: idx.background || false,
          })),
          fieldTypes,
          sampleDocuments: sampleDocs,
        },
      });
    } catch (error) {
      console.error('Error fetching collection details:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch collection details',
      });
    }
  }

  /**
   * POST /api/admin/schema/init
   * Initialize database schema (create collections and indexes)
   */
  static async initSchema(req: Request, res: Response): Promise<void> {
    try {
      const db = mongo.getDb();
      const schemas = await SchemaController.getDefaultSchemas();
      
      const results: Array<{ collection: string; status: string; indexesCreated: number }> = [];
      
      for (const schema of schemas) {
        try {
          // Check if collection exists
          const collections = await db.listCollections({ name: schema.name }).toArray();
          const collectionExists = collections.length > 0;
          
          // Create collection if it doesn't exist
          if (!collectionExists) {
            try {
              await db.createCollection(schema.name);
              console.log(`Created collection: ${schema.name}`);
            } catch (createError: any) {
              // If collection creation fails, it might already exist (race condition)
              // or there's a permission issue
              if (createError.code === 48) {
                // Namespace exists error - collection already exists, continue
                console.log(`Collection ${schema.name} already exists`);
              } else {
                throw createError;
              }
            }
          }
          
          const coll = db.collection(schema.name);
          const existingIndexes = await coll.indexes();
          const existingIndexNames = new Set(existingIndexes.map((idx: any) => idx.name));
          
          let indexesCreated = 0;
          
          // Create indexes
          for (const indexDef of schema.indexes) {
            // Generate index name
            const indexName = indexDef.options?.name || 
              Object.keys(indexDef.keys).map(k => `${k}_${indexDef.keys[k]}`).join('_');
            
            if (!existingIndexNames.has(indexName)) {
              try {
                await coll.createIndex(indexDef.keys, {
                  ...indexDef.options,
                  name: indexName,
                });
                indexesCreated++;
                console.log(`Created index ${indexName} on ${schema.name}`);
              } catch (err: any) {
                // Handle index creation errors
                if (err.code === 85) {
                  // Index already exists with different options
                  console.warn(`Index ${indexName} on ${schema.name} already exists with different options`);
                } else if (err.code === 86) {
                  // Index already exists
                  console.log(`Index ${indexName} on ${schema.name} already exists`);
                } else {
                  console.error(`Error creating index ${indexName} on ${schema.name}:`, err);
                }
              }
            }
          }
          
          results.push({
            collection: schema.name,
            status: collectionExists ? 'exists' : 'created',
            indexesCreated,
          });
        } catch (error) {
          console.error(`Error processing collection ${schema.name}:`, error);
          results.push({
            collection: schema.name,
            status: `error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            indexesCreated: 0,
          });
        }
      }
      
      res.json({
        ok: true,
        message: 'Schema initialization completed',
        results,
      });
    } catch (error) {
      console.error('Error initializing schema:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to initialize schema',
      });
    }
  }

  /**
   * Get default schema definitions
   */
  private static getDefaultSchemas(): CollectionSchema[] {
    // Return full schema list (same as in init_mongodb_schema.ts)
    return [
      {
        name: 'users',
        indexes: [
          { keys: { email: 1 }, options: { unique: true } },
          { keys: { createdAt: -1 } },
          { keys: { role: 1 } },
          { keys: { isEmailVerified: 1 } },
          { keys: { emailVerificationToken: 1 }, options: { sparse: true } },
          { keys: { resetPasswordToken: 1 }, options: { sparse: true } },
        ],
      },
      {
        name: 'sessions',
        indexes: [
          { keys: { token: 1 }, options: { unique: true } },
          { keys: { userId: 1 } },
          { keys: { refreshToken: 1 }, options: { unique: true, sparse: true } },
          { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
          { keys: { createdAt: -1 } },
          { keys: { userId: 1, createdAt: -1 } },
        ],
      },
      {
        name: 'reset_password_tokens',
        indexes: [
          { keys: { tokenHash: 1 }, options: { unique: true } },
          { keys: { userId: 1 } },
          { keys: { used: 1 } },
          { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
          { keys: { createdAt: -1 } },
          { keys: { userId: 1, used: 1 } },
        ],
      },
      {
        name: 'products',
        indexes: [
          { keys: { slug: 1 }, options: { unique: true } },
          { keys: { categoryId: 1 } },
          { keys: { status: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { name: 'text', description: 'text' }, options: { name: 'product_text_search' } },
          { keys: { sku: 1 }, options: { sparse: true } },
        ],
      },
      {
        name: 'categories',
        indexes: [
          { keys: { slug: 1 }, options: { unique: true } },
          { keys: { parentId: 1 } },
          { keys: { sortOrder: 1 } },
          { keys: { name: 'text' }, options: { name: 'category_text_search' } },
        ],
      },
      {
        name: 'inventory',
        indexes: [
          { keys: { productId: 1 }, options: { unique: true } },
          { keys: { quantity: 1 } },
          { keys: { updatedAt: -1 } },
        ],
      },
      {
        name: 'carts',
        indexes: [
          { keys: { userId: 1 }, options: { sparse: true } },
          { keys: { sessionId: 1 }, options: { sparse: true } },
          { keys: { updatedAt: -1 } },
          { keys: { userId: 1, sessionId: 1 }, options: { unique: true, sparse: true } },
        ],
      },
      {
        name: 'orders',
        indexes: [
          { keys: { userId: 1 } },
          { keys: { guestEmail: 1 }, options: { sparse: true } },
          { keys: { status: 1 } },
          { keys: { placedAt: -1 } },
          { keys: { razorpayOrderId: 1 }, options: { sparse: true } },
          { keys: { createdAt: -1 } },
          { keys: { userId: 1, status: 1 } },
        ],
      },
      {
        name: 'payments',
        indexes: [
          { keys: { orderId: 1 } },
          { keys: { razorpayPaymentId: 1 }, options: { sparse: true } },
          { keys: { status: 1 } },
          { keys: { createdAt: -1 } },
        ],
      },
      {
        name: 'shipments',
        indexes: [
          { keys: { orderId: 1 } },
          { keys: { awb: 1 }, options: { sparse: true } },
          { keys: { status: 1 } },
          { keys: { createdAt: -1 } },
        ],
      },
      {
        name: 'reviews',
        indexes: [
          { keys: { productId: 1 } },
          { keys: { userId: 1 } },
          { keys: { rating: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { productId: 1, userId: 1 }, options: { unique: true } },
        ],
      },
      {
        name: 'wishlist',
        indexes: [
          { keys: { userId: 1 } },
          { keys: { productId: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { userId: 1, productId: 1 }, options: { unique: true } },
        ],
      },
      {
        name: 'coupons',
        indexes: [
          { keys: { code: 1 }, options: { unique: true } },
          { keys: { isActive: 1 } },
          { keys: { validFrom: 1, validUntil: 1 } },
          { keys: { createdAt: -1 } },
        ],
      },
      {
        name: 'loyalty_transactions',
        indexes: [
          { keys: { userId: 1 } },
          { keys: { type: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { userId: 1, createdAt: -1 } },
        ],
      },
      {
        name: 'price_alerts',
        indexes: [
          { keys: { userId: 1 } },
          { keys: { productId: 1 } },
          { keys: { isActive: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { userId: 1, productId: 1 }, options: { unique: true } },
        ],
      },
      {
        name: 'recently_viewed',
        indexes: [
          { keys: { userId: 1 }, options: { sparse: true } },
          { keys: { sessionId: 1 }, options: { sparse: true } },
          { keys: { viewedAt: -1 } },
          { keys: { userId: 1, viewedAt: -1 }, options: { sparse: true } },
          { keys: { sessionId: 1, viewedAt: -1 }, options: { sparse: true } },
        ],
      },
      {
        name: 'product_qa',
        indexes: [
          { keys: { productId: 1 } },
          { keys: { userId: 1 }, options: { sparse: true } },
          { keys: { isAnswered: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { productId: 1, createdAt: -1 } },
        ],
      },
      {
        name: 'support_tickets',
        indexes: [
          { keys: { userId: 1 } },
          { keys: { status: 1 } },
          { keys: { priority: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { userId: 1, status: 1 } },
        ],
      },
      {
        name: 'support_ticket_replies',
        indexes: [
          { keys: { ticketId: 1 } },
          { keys: { userId: 1 } },
          { keys: { createdAt: 1 } },
          { keys: { ticketId: 1, createdAt: 1 } },
        ],
      },
      {
        name: 'addresses',
        indexes: [
          { keys: { userId: 1 } },
          { keys: { isDefault: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { userId: 1, isDefault: 1 } },
        ],
      },
      {
        name: 'frequently_bought_together',
        indexes: [
          { keys: { productId: 1 } },
          { keys: { relatedProductId: 1 } },
          { keys: { count: -1 } },
          { keys: { productId: 1, relatedProductId: 1 }, options: { unique: true } },
        ],
      },
      {
        name: 'web_push_subscriptions',
        indexes: [
          { keys: { userId: 1 }, options: { sparse: true } },
          { keys: { endpoint: 1 }, options: { unique: true } },
          { keys: { createdAt: -1 } },
        ],
      },
      {
        name: 'settings',
        indexes: [
          { keys: { key: 1 }, options: { unique: true } },
          { keys: { section: 1 } },
          { keys: { updatedAt: -1 } },
        ],
      },
      {
        name: 'audit_logs',
        indexes: [
          { keys: { actorId: 1 } },
          { keys: { action: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { actorId: 1, createdAt: -1 } },
          { keys: { action: 1, createdAt: -1 } },
          { keys: { createdAt: 1 }, options: { expireAfterSeconds: 31536000 } },
        ],
      },
      {
        name: 'bulk_import_jobs',
        indexes: [
          { keys: { adminId: 1 } },
          { keys: { status: 1 } },
          { keys: { createdAt: -1 } },
          { keys: { adminId: 1, createdAt: -1 } },
        ],
      },
      {
        name: 'email_templates',
        indexes: [
          { keys: { eventType: 1 } },
          { keys: { createdAt: -1 } },
        ],
      },
      {
        name: 'secrets',
        indexes: [
          { keys: { key: 1 }, options: { unique: true } },
          { keys: { category: 1 } },
        ],
      },
      {
        name: 'countries',
        indexes: [
          { keys: { code: 1 }, options: { unique: true } },
          { keys: { enabled: 1 } },
        ],
      },
    ];
  }
}


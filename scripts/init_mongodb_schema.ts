/**
 * MongoDB Schema Initialization Script
 * 
 * Creates all necessary collections with proper indexes for optimal performance.
 * Run this script once to set up the database schema.
 * 
 * Usage: npx ts-node scripts/init_mongodb_schema.ts
 */

import { MongoClient, Db } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';

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

const schemas: CollectionSchema[] = [
  // Users collection
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
  // Sessions collection
  {
    name: 'sessions',
    indexes: [
      { keys: { token: 1 }, options: { unique: true } },
      { keys: { userId: 1 } },
      { keys: { refreshToken: 1 }, options: { unique: true, sparse: true } },
      { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } }, // TTL index
      { keys: { createdAt: -1 } },
      { keys: { userId: 1, createdAt: -1 } },
    ],
  },
  // Reset password tokens collection
  {
    name: 'reset_password_tokens',
    indexes: [
      { keys: { tokenHash: 1 }, options: { unique: true } },
      { keys: { userId: 1 } },
      { keys: { used: 1 } },
      { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } }, // TTL index
      { keys: { createdAt: -1 } },
      { keys: { userId: 1, used: 1 } },
    ],
  },
  // Products collection
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
  // Categories collection
  {
    name: 'categories',
    indexes: [
      { keys: { slug: 1 }, options: { unique: true } },
      { keys: { parentId: 1 } },
      { keys: { sortOrder: 1 } },
      { keys: { name: 'text' }, options: { name: 'category_text_search' } },
    ],
  },
  // Inventory collection
  {
    name: 'inventory',
    indexes: [
      { keys: { productId: 1 }, options: { unique: true } },
      { keys: { quantity: 1 } },
      { keys: { updatedAt: -1 } },
    ],
  },
  // Cart collection
  {
    name: 'carts',
    indexes: [
      { keys: { userId: 1 }, options: { sparse: true } },
      { keys: { sessionId: 1 }, options: { sparse: true } },
      { keys: { updatedAt: -1 } },
      { keys: { userId: 1, sessionId: 1 }, options: { unique: true, sparse: true } },
    ],
  },
  // Orders collection
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
  // Payments collection
  {
    name: 'payments',
    indexes: [
      { keys: { orderId: 1 } },
      { keys: { razorpayPaymentId: 1 }, options: { sparse: true } },
      { keys: { status: 1 } },
      { keys: { createdAt: -1 } },
    ],
  },
  // Shipments collection
  {
    name: 'shipments',
    indexes: [
      { keys: { orderId: 1 } },
      { keys: { awb: 1 }, options: { sparse: true } },
      { keys: { status: 1 } },
      { keys: { createdAt: -1 } },
    ],
  },
  // Reviews collection
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
  // Wishlist collection
  {
    name: 'wishlist',
    indexes: [
      { keys: { userId: 1 } },
      { keys: { productId: 1 } },
      { keys: { createdAt: -1 } },
      { keys: { userId: 1, productId: 1 }, options: { unique: true } },
    ],
  },
  // Coupons collection
  {
    name: 'coupons',
    indexes: [
      { keys: { code: 1 }, options: { unique: true } },
      { keys: { isActive: 1 } },
      { keys: { validFrom: 1, validUntil: 1 } },
      { keys: { createdAt: -1 } },
    ],
  },
  // Loyalty transactions collection
  {
    name: 'loyalty_transactions',
    indexes: [
      { keys: { userId: 1 } },
      { keys: { type: 1 } },
      { keys: { createdAt: -1 } },
      { keys: { userId: 1, createdAt: -1 } },
    ],
  },
  // Price alerts collection
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
  // Recently viewed collection
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
  // Product Q&A collection
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
  // Support tickets collection
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
  // Support ticket replies collection
  {
    name: 'support_ticket_replies',
    indexes: [
      { keys: { ticketId: 1 } },
      { keys: { userId: 1 } },
      { keys: { createdAt: 1 } },
      { keys: { ticketId: 1, createdAt: 1 } },
    ],
  },
  // Addresses collection
  {
    name: 'addresses',
    indexes: [
      { keys: { userId: 1 } },
      { keys: { isDefault: 1 } },
      { keys: { createdAt: -1 } },
      { keys: { userId: 1, isDefault: 1 } },
    ],
  },
  // Frequently bought together collection
  {
    name: 'frequently_bought_together',
    indexes: [
      { keys: { productId: 1 } },
      { keys: { relatedProductId: 1 } },
      { keys: { count: -1 } },
      { keys: { productId: 1, relatedProductId: 1 }, options: { unique: true } },
    ],
  },
  // Web push subscriptions collection
  {
    name: 'web_push_subscriptions',
    indexes: [
      { keys: { userId: 1 }, options: { sparse: true } },
      { keys: { endpoint: 1 }, options: { unique: true } },
      { keys: { createdAt: -1 } },
    ],
  },
  // Settings collection
  {
    name: 'settings',
    indexes: [
      { keys: { key: 1 }, options: { unique: true } },
      { keys: { section: 1 } },
      { keys: { updatedAt: -1 } },
    ],
  },
  // Audit logs collection
  {
    name: 'audit_logs',
    indexes: [
      { keys: { actorId: 1 } },
      { keys: { action: 1 } },
      { keys: { createdAt: -1 } },
      { keys: { actorId: 1, createdAt: -1 } },
      { keys: { action: 1, createdAt: -1 } },
      { keys: { createdAt: 1 }, options: { expireAfterSeconds: 31536000 } }, // TTL: 1 year
    ],
  },
  // Bulk import jobs collection
  {
    name: 'bulk_import_jobs',
    indexes: [
      { keys: { adminId: 1 } },
      { keys: { status: 1 } },
      { keys: { createdAt: -1 } },
      { keys: { adminId: 1, createdAt: -1 } },
    ],
  },
];

async function initializeSchema(): Promise<void> {
  let client: MongoClient | null = null;

  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db: Db = client.db();

    console.log('\n📋 Initializing collections and indexes...\n');

    for (const schema of schemas) {
      try {
        // Create collection if it doesn't exist
        const collection = db.collection(schema.name);
        const collectionExists = await db.listCollections({ name: schema.name }).hasNext();

        if (!collectionExists) {
          await db.createCollection(schema.name);
          console.log(`✅ Created collection: ${schema.name}`);
        } else {
          console.log(`ℹ️  Collection already exists: ${schema.name}`);
        }

        // Create indexes
        for (const index of schema.indexes) {
          try {
            await collection.createIndex(index.keys, index.options || {});
            const indexName = index.options?.name || Object.keys(index.keys).join('_');
            console.log(`   ✅ Created index: ${indexName}`);
          } catch (error: any) {
            if (error.code === 85) {
              // Index already exists with different options
              console.log(`   ⚠️  Index already exists (different options): ${index.options?.name || 'unnamed'}`);
            } else if (error.code === 86) {
              // Index already exists
              console.log(`   ℹ️  Index already exists: ${index.options?.name || 'unnamed'}`);
            } else {
              console.error(`   ❌ Error creating index: ${error.message}`);
            }
          }
        }
      } catch (error: any) {
        console.error(`❌ Error processing collection ${schema.name}: ${error.message}`);
      }
    }

    console.log('\n✅ Schema initialization completed!');
    console.log(`\n📊 Total collections: ${schemas.length}`);
  } catch (error) {
    console.error('❌ Error initializing schema:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Export schemas for use in other modules
export { schemas, CollectionSchema, IndexDefinition };

// Run the script
if (require.main === module) {
  initializeSchema()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}


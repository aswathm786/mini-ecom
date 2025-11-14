/**
 * Seed Products Script
 * 
 * Loads sample categories, products, and inventory into the database.
 * 
 * Usage:
 *   ts-node scripts/seed_products.ts
 *   or
 *   node scripts/seed_products.js (after compilation)
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/handmade_harmony';

interface Category {
  name: string;
  slug: string;
  description: string;
  parentId?: string;
  sortOrder: number;
  createdAt: Date;
}

interface Product {
  name: string;
  slug: string;
  description: string;
  price: number;
  sku: string;
  status: 'active' | 'inactive' | 'draft';
  categoryId?: string;
  images: Array<{ filename: string; url: string; alt?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

interface Inventory {
  productId: ObjectId;
  qty: number;
  lowStockThreshold: number;
  updatedAt: Date;
}

async function seedProducts() {
  let client: MongoClient | null = null;

  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const categoriesCollection = db.collection<Category>('categories');
    const productsCollection = db.collection<Product>('products');
    const inventoryCollection = db.collection<Inventory>('inventory');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await categoriesCollection.deleteMany({});
    // await productsCollection.deleteMany({});
    // await inventoryCollection.deleteMany({});

    // Create categories
    console.log('Creating categories...');
    const categories: Category[] = [
      {
        name: 'Home Decor',
        slug: 'home-decor',
        description: 'Beautiful home decoration items',
        sortOrder: 1,
        createdAt: new Date(),
      },
      {
        name: 'Kitchen & Dining',
        slug: 'kitchen-dining',
        description: 'Handcrafted kitchen and dining accessories',
        sortOrder: 2,
        createdAt: new Date(),
      },
      {
        name: 'Accessories',
        slug: 'accessories',
        description: 'Fashion and lifestyle accessories',
        sortOrder: 3,
        createdAt: new Date(),
      },
    ];

    const categoryResults = await categoriesCollection.insertMany(categories);
    const categoryIds = Object.values(categoryResults.insertedIds);
    console.log(`✓ Created ${categoryIds.length} categories`);

    // Create products
    console.log('Creating products...');
    const products: Product[] = [
      {
        name: 'Handmade Ceramic Bowl',
        slug: 'handmade-ceramic-bowl',
        description: 'Beautiful handcrafted ceramic bowl perfect for serving. Made with traditional techniques and high-quality materials.',
        price: 1299,
        sku: 'HCB-001',
        status: 'active',
        categoryId: categoryIds[1].toString(),
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Woven Bamboo Basket',
        slug: 'woven-bamboo-basket',
        description: 'Eco-friendly bamboo basket for storage and decoration. Handwoven by skilled artisans.',
        price: 899,
        sku: 'WBB-001',
        status: 'active',
        categoryId: categoryIds[0].toString(),
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Handwoven Cotton Scarf',
        slug: 'handwoven-cotton-scarf',
        description: 'Soft and comfortable handwoven cotton scarf. Perfect for all seasons.',
        price: 599,
        sku: 'HCS-001',
        status: 'active',
        categoryId: categoryIds[2].toString(),
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Wooden Serving Tray',
        slug: 'wooden-serving-tray',
        description: 'Elegant wooden serving tray with handles. Made from sustainably sourced wood.',
        price: 1499,
        sku: 'WST-001',
        status: 'active',
        categoryId: categoryIds[1].toString(),
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Hand-painted Vase',
        slug: 'hand-painted-vase',
        description: 'Unique hand-painted ceramic vase for flowers. Each piece is one-of-a-kind.',
        price: 1999,
        sku: 'HPV-001',
        status: 'active',
        categoryId: categoryIds[0].toString(),
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Leather Journal',
        slug: 'leather-journal',
        description: 'Premium leather-bound journal for writing. Perfect for notes, sketches, or diary entries.',
        price: 799,
        sku: 'LJ-001',
        status: 'active',
        categoryId: categoryIds[2].toString(),
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const productResults = await productsCollection.insertMany(products);
    const productIds = Object.values(productResults.insertedIds);
    console.log(`✓ Created ${productIds.length} products`);

    // Create inventory
    console.log('Creating inventory...');
    const inventory: Inventory[] = productIds.map((productId, index) => ({
      productId,
      qty: [50, 30, 40, 25, 15, 35][index] || 20, // Varying stock levels
      lowStockThreshold: 10,
      updatedAt: new Date(),
    }));

    await inventoryCollection.insertMany(inventory);
    console.log(`✓ Created inventory for ${inventory.length} products`);

    console.log('\n✅ Seed completed successfully!');
    console.log(`   Categories: ${categoryIds.length}`);
    console.log(`   Products: ${productIds.length}`);
    console.log(`   Inventory records: ${inventory.length}`);

  } catch (error) {
    console.error('❌ Error seeding products:');
    console.error(error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\nMongoDB connection closed.');
    }
  }
}

// Run the seed function
seedProducts()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });


/**
 * Seed Sample Data Script
 * 
 * Inserts sample categories, products, and users into MongoDB.
 * This script is idempotent - safe to run multiple times.
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:changeme@localhost:27017/miniecom?authSource=admin';

async function seed() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db();
        
        // Seed categories (idempotent - upsert by slug)
        const categories = [
            { 
                slug: 'handmade-jewelry', 
                name: 'Handmade Jewelry', 
                description: 'Unique handmade jewelry pieces',
                image: '/images/categories/jewelry.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            { 
                slug: 'artisan-crafts', 
                name: 'Artisan Crafts', 
                description: 'Beautiful artisan crafts',
                image: '/images/categories/crafts.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            { 
                slug: 'home-decor', 
                name: 'Home Decor', 
                description: 'Decorative items for your home',
                image: '/images/categories/decor.jpg',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        
        for (const category of categories) {
            await db.collection('categories').updateOne(
                { slug: category.slug },
                { $set: category },
                { upsert: true }
            );
            console.log(`Category seeded: ${category.name}`);
        }
        
        // Seed products (idempotent - upsert by slug)
        const products = [
            {
                slug: 'handmade-silver-necklace-001',
                name: 'Handmade Silver Necklace',
                description: 'Beautiful handmade silver necklace with intricate designs',
                price: 2999,
                stock: 10,
                category: 'handmade-jewelry',
                status: 'active',
                images: ['/images/products/necklace-1.jpg'],
                sku: 'JWL-NECK-001',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                slug: 'artisan-pottery-bowl-001',
                name: 'Artisan Pottery Bowl',
                description: 'Handcrafted pottery bowl perfect for serving',
                price: 1499,
                stock: 5,
                category: 'artisan-crafts',
                status: 'active',
                images: ['/images/products/bowl-1.jpg'],
                sku: 'CRFT-BOWL-001',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                slug: 'handwoven-wall-hanging-001',
                name: 'Handwoven Wall Hanging',
                description: 'Beautiful handwoven wall hanging for home decor',
                price: 2499,
                stock: 8,
                category: 'home-decor',
                status: 'active',
                images: ['/images/products/wall-hanging-1.jpg'],
                sku: 'DECOR-WALL-001',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        
        for (const product of products) {
            await db.collection('products').updateOne(
                { slug: product.slug },
                { $set: product },
                { upsert: true }
            );
            console.log(`Product seeded: ${product.name}`);
        }
        
        // Seed sample users (idempotent - upsert by email)
        const users = [
            {
                email: 'customer@example.com',
                firstName: 'John',
                lastName: 'Doe',
                password: '$argon2id$v=19$m=65536,t=3,p=4$dummy$hash', // Placeholder - use seed_admin.js for real passwords
                role: 'customer',
                roles: ['customer'],
                status: 'active',
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        
        for (const user of users) {
            await db.collection('users').updateOne(
                { email: user.email },
                { $set: user },
                { upsert: true }
            );
            console.log(`User seeded: ${user.email}`);
        }
        
        console.log('\nSample data seeded successfully!');
        console.log('Note: User passwords are placeholders. Use seed_admin.js for real admin users.');
        
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run if called directly
if (require.main === module) {
    seed();
}

module.exports = seed;


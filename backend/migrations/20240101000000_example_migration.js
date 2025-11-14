/**
 * Example Migration
 * 
 * This is a sample migration file showing the expected format.
 * Migrations are run in order by timestamp prefix.
 * 
 * To create a new migration:
 * 1. Copy this file with a new timestamp and descriptive name
 * 2. Implement the migration logic
 * 3. Run: ./scripts/migrate.sh
 */

const { MongoClient } = require('mongodb');

/**
 * Migration function
 * @param {string} mongoUri - MongoDB connection string
 */
module.exports = async function(mongoUri) {
    const client = new MongoClient(mongoUri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db();
        
        // Example: Create indexes
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('products').createIndex({ slug: 1 }, { unique: true });
        await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
        
        // Example: Create collections with validation
        // await db.createCollection('categories', {
        //     validator: {
        //         $jsonSchema: {
        //             bsonType: 'object',
        //             required: ['name', 'slug'],
        //             properties: {
        //                 name: { bsonType: 'string' },
        //                 slug: { bsonType: 'string' }
        //             }
        //         }
        //     }
        // });
        
        console.log('Migration completed successfully');
        
    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    } finally {
        await client.close();
    }
};


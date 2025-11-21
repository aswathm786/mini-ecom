/**
 * Seed Roles Script
 * 
 * Adds the roles shown in the admin panel to the database:
 * - admin: Administrator role with full access
 * - root: Root role with all permissions
 * - catalog: Catalog role with catalog and webhook permissions
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/handmade_harmony';
const DB_NAME = process.env.DB_NAME || process.env.MONGODB_DB_NAME || 'handmade_harmony';

const permissionCatalog = [
  { key: 'catalog.view', label: 'View Catalog', category: 'Catalog' },
  { key: 'catalog.manage', label: 'Manage Products', category: 'Catalog' },
  { key: 'orders.view', label: 'View Orders', category: 'Orders' },
  { key: 'orders.manage', label: 'Manage Orders', category: 'Orders' },
  { key: 'refunds.manage', label: 'Process Refunds', category: 'Orders' },
  { key: 'users.view', label: 'View Users', category: 'Customers' },
  { key: 'users.manage', label: 'Manage Users', category: 'Customers' },
  { key: 'marketing.manage', label: 'Marketing Studio', category: 'Marketing' },
  { key: 'webhooks.manage', label: 'Webhook Monitoring', category: 'Integrations' },
  { key: 'settings.manage', label: 'Platform Settings', category: 'Settings' },
];

const allPermissions = permissionCatalog.map(p => p.key);

async function seedRoles() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Use database name from URI if provided, otherwise use DB_NAME
    const db = MONGO_URI.includes('/') && MONGO_URI.split('/').length > 3 
      ? client.db(MONGO_URI.split('/').pop())
      : client.db(DB_NAME);
    const rolesCollection = db.collection('roles');
    
    const roles = [
      {
        name: 'admin',
        description: 'Administrator role with full access.',
        permissions: allPermissions,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'root',
        description: 'Root role with all permissions.',
        permissions: allPermissions, // All permissions for root
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'catalog',
        description: 'Catalog management role with catalog and webhook access.',
        permissions: [
          'catalog.view',
          'catalog.manage',
          'webhooks.manage',
        ],
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    console.log('\nSeeding roles...\n');
    
    for (const role of roles) {
      const existing = await rolesCollection.findOne({ name: role.name });
      
      if (existing) {
        console.log(`Role "${role.name}" already exists. Updating...`);
        await rolesCollection.updateOne(
          { name: role.name },
          {
            $set: {
              description: role.description,
              permissions: role.permissions,
              isSystem: role.isSystem,
              updatedAt: new Date(),
            },
          }
        );
        console.log(`✓ Updated role: ${role.name}`);
      } else {
        await rolesCollection.insertOne(role);
        console.log(`✓ Created role: ${role.name}`);
      }
      
      console.log(`  Description: ${role.description}`);
      console.log(`  Permissions: ${role.permissions.length} permission(s)`);
      console.log(`  Permissions: ${role.permissions.join(', ')}\n`);
    }
    
    console.log('✓ All roles seeded successfully!\n');
    
  } catch (error) {
    console.error('Error seeding roles:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedRoles();


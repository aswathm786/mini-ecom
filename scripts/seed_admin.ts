/**
 * Handmade Harmony - Seed Admin User Script
 * 
 * This script creates the initial admin user in the MongoDB database.
 * It reads ADMIN_EMAIL and ADMIN_PASSWORD from environment variables.
 * 
 * Usage:
 *   node scripts/seed_admin.js
 *   or
 *   ts-node scripts/seed_admin.ts
 *   or via migrate.sh:
 *   ./scripts/migrate.sh seed_admin.ts
 */

import { MongoClient, Db } from 'mongodb';
import * as argon2 from 'argon2';

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/handmade_harmony';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';

interface User {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

async function seedAdmin() {
  let client: MongoClient | null = null;

  try {
    console.log('Connecting to MongoDB...');
    console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db: Db = client.db();
    const usersCollection = db.collection('users');
    const rolesCollection = db.collection('roles');
    const userRolesCollection = db.collection('user_roles');

    // Check if admin user already exists
    const existingAdmin = await usersCollection.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log(`⚠️  Admin user with email "${ADMIN_EMAIL}" already exists.`);
      console.log('   Skipping seed. To recreate, delete the user first.');
      return;
    }

    // Ensure "admin" role exists
    let adminRole = await rolesCollection.findOne({ name: 'admin' });
    if (!adminRole) {
      console.log('Creating "admin" role...');
      const roleResult = await rolesCollection.insertOne({
        name: 'admin',
        description: 'Administrator with full system access',
        permissions: ['*'], // All permissions
        createdAt: new Date(),
        updatedAt: new Date()
      });
      adminRole = await rolesCollection.findOne({ _id: roleResult.insertedId });
      console.log('✓ Admin role created');
    } else {
      console.log('✓ Admin role already exists');
    }

    // Hash password using Argon2id
    console.log('Hashing password...');
    const hashedPassword = await argon2.hash(ADMIN_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4
    });

    // Create admin user
    console.log('Creating admin user...');
    const user: User = {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isEmailVerified: true,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const userResult = await usersCollection.insertOne(user);
    console.log(`✓ Admin user created with ID: ${userResult.insertedId}`);

    // Assign admin role to user
    await userRolesCollection.insertOne({
      userId: userResult.insertedId,
      roleId: adminRole!._id,
      assignedAt: new Date(),
      assignedBy: null // System assignment
    });
    console.log('✓ Admin role assigned to user');

    console.log('\n✅ Admin user seeded successfully!');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  IMPORTANT: Change the admin password after first login!');

  } catch (error) {
    console.error('❌ Error seeding admin user:');
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
seedAdmin()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });


#!/usr/bin/env node

/**
 * Seed Admin User Script
 * Creates an admin user with root/admin role using Argon2 hashing
 * 
 * Usage: node scripts/seed_admin.js
 * 
 * Reads from environment:
 * - ADMIN_EMAIL: Admin user email (default: admin@example.com)
 * - ADMIN_PASSWORD: Admin user password (default: admin123)
 * - ADMIN_FIRST_NAME: Admin first name (default: Admin)
 * - ADMIN_LAST_NAME: Admin last name (default: User)
 * - MONGO_URI: MongoDB connection string
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Use Argon2 if available, fallback to bcrypt
let hashPassword, verifyPassword;
try {
    const argon2 = require('argon2');
    hashPassword = async (password) => await argon2.hash(password);
    verifyPassword = async (hash, password) => await argon2.verify(hash, password);
    console.log('Using Argon2 for password hashing');
} catch (e) {
    const bcrypt = require('bcrypt');
    hashPassword = async (password) => await bcrypt.hash(password, 10);
    verifyPassword = async (hash, password) => await bcrypt.compare(password, hash);
    console.log('Using bcrypt for password hashing (Argon2 not available)');
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:changeme@localhost:27017/miniecom?authSource=admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'User';

async function seedAdmin() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db();
        
        // Check if admin user already exists
        const existingUser = await db.collection('users').findOne({ email: ADMIN_EMAIL });
        
        if (existingUser) {
            console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
            console.log('Updating admin user...');
            
            // Update existing user
            const hashedPassword = await hashPassword(ADMIN_PASSWORD);
            await db.collection('users').updateOne(
                { email: ADMIN_EMAIL },
                {
                    $set: {
                        firstName: ADMIN_FIRST_NAME,
                        lastName: ADMIN_LAST_NAME,
                        password: hashedPassword,
                        role: 'root',
                        roles: ['root', 'admin'],
                        permissions: [
                            'order.view', 'order.update', 'order.refund', 'order.capture',
                            'shipment.create', 'shipment.view', 'shipment.cancel',
                            'refund.view', 'refund.process',
                            'product.view', 'product.edit', 'product.create', 'product.delete',
                            'user.view', 'user.edit', 'user.delete',
                            'role.view', 'role.create', 'role.edit', 'role.delete',
                            'settings.view', 'settings.edit',
                            'report.view', 'report.export',
                            'audit.view',
                        ],
                        updatedAt: new Date(),
                    }
                }
            );
            
            console.log('Admin user updated successfully');
        } else {
            console.log('Creating new admin user...');
            
            // Create new admin user
            const hashedPassword = await hashPassword(ADMIN_PASSWORD);
            const adminUser = {
                email: ADMIN_EMAIL,
                firstName: ADMIN_FIRST_NAME,
                lastName: ADMIN_LAST_NAME,
                password: hashedPassword,
                role: 'root',
                roles: ['root', 'admin'],
                permissions: [
                    'order.view', 'order.update', 'order.refund', 'order.capture',
                    'shipment.create', 'shipment.view', 'shipment.cancel',
                    'refund.view', 'refund.process',
                    'product.view', 'product.edit', 'product.create', 'product.delete',
                    'user.view', 'user.edit', 'user.delete',
                    'role.view', 'role.create', 'role.edit', 'role.delete',
                    'settings.view', 'settings.edit',
                    'report.view', 'report.export',
                    'audit.view',
                ],
                status: 'active',
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            await db.collection('users').insertOne(adminUser);
            console.log('Admin user created successfully');
        }
        
        // Ensure admin role exists in roles collection
        await db.collection('roles').updateOne(
            { name: 'admin' },
            {
                $set: {
                    name: 'admin',
                    description: 'Administrator role with full access',
                    permissions: [
                        'order.view', 'order.update', 'order.refund', 'order.capture',
                        'shipment.create', 'shipment.view', 'shipment.cancel',
                        'refund.view', 'refund.process',
                        'product.view', 'product.edit', 'product.create', 'product.delete',
                        'user.view', 'user.edit', 'user.delete',
                        'role.view', 'role.create', 'role.edit', 'role.delete',
                        'settings.view', 'settings.edit',
                        'report.view', 'report.export',
                        'audit.view',
                    ],
                    updatedAt: new Date(),
                }
            },
            { upsert: true }
        );
        
        await db.collection('roles').updateOne(
            { name: 'root' },
            {
                $set: {
                    name: 'root',
                    description: 'Root role with all permissions',
                    permissions: ['*'], // All permissions
                    updatedAt: new Date(),
                }
            },
            { upsert: true }
        );
        
        console.log('Roles ensured');
        console.log(`\nAdmin user credentials:`);
        console.log(`Email: ${ADMIN_EMAIL}`);
        console.log(`Password: ${ADMIN_PASSWORD}`);
        console.log(`\n⚠️  Please change the default password after first login!`);
        
    } catch (error) {
        console.error('Error seeding admin user:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

seedAdmin();


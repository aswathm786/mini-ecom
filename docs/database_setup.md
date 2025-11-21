# Database Setup Guide

This guide covers MongoDB database initialization, schema setup, and index management.

## Table of Contents

- [MongoDB Schema Initialization](#mongodb-schema-initialization)
- [Running the Schema Script](#running-the-schema-script)
- [Database Collections](#database-collections)
- [Indexes](#indexes)
- [Troubleshooting](#troubleshooting)

---

## MongoDB Schema Initialization

The MongoDB schema initialization script creates all necessary collections and indexes for optimal performance. This script should be run **once** after setting up MongoDB, or whenever you need to recreate the database schema.

### What the Script Does

The `scripts/init_mongodb_schema.ts` script:

1. **Creates Collections**: Creates all 24 collections if they don't exist
2. **Creates Indexes**: Sets up optimized indexes for fast queries
3. **TTL Indexes**: Configures automatic expiration for sessions and audit logs
4. **Unique Constraints**: Ensures data integrity with unique indexes

### Collections Created

The script initializes the following collections:

#### Core Collections
- `users` - User accounts and profiles
- `sessions` - Active user sessions (with TTL)
- `products` - Product catalog
- `categories` - Product categories
- `inventory` - Product inventory levels
- `carts` - Shopping carts
- `orders` - Customer orders
- `payments` - Payment records
- `shipments` - Shipping information

#### Feature Collections
- `reviews` - Product reviews
- `wishlist` - User wishlists
- `coupons` - Discount coupons
- `loyalty_transactions` - Loyalty point transactions
- `price_alerts` - Price drop alerts
- `recently_viewed` - Recently viewed products
- `product_qa` - Product Q&A
- `support_tickets` - Support tickets
- `support_ticket_replies` - Ticket replies
- `addresses` - User addresses
- `frequently_bought_together` - Product recommendations
- `web_push_subscriptions` - Web push notification subscriptions

#### System Collections
- `settings` - Application settings
- `audit_logs` - Audit trail (with TTL)
- `bulk_import_jobs` - Bulk import job tracking

---

## Running the Schema Script

### Prerequisites

1. **MongoDB Running**: Ensure MongoDB is running and accessible
2. **Environment Variables**: Set `MONGODB_URI` in `.env` file
3. **Dependencies Installed**: Run `npm install` in the `scripts/` directory

### Method 1: From Project Root (Recommended)

**On Linux/Mac:**
```bash
npx ts-node --project scripts/tsconfig.json scripts/init_mongodb_schema.ts
```

**On Windows (PowerShell):**
```powershell
npx ts-node --project scripts/tsconfig.json scripts/init_mongodb_schema.ts
```

### Method 2: Using npm Script

**On Linux/Mac:**
```bash
cd scripts
npm install  # First time only
npm run init-schema
```

**On Windows (PowerShell):**
```powershell
cd scripts
npm install  # First time only
npm run init-schema
```

### Method 3: Using Helper Scripts

**On Linux/Mac:**
```bash
bash scripts/init_schema.sh
```

**On Windows (PowerShell):**
```powershell
.\scripts\init_schema.ps1
```

### Expected Output

When the script runs successfully, you should see:

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📋 Initializing collections and indexes...

✅ Created collection: products
   ✅ Created index: slug
   ✅ Created index: categoryId
   ✅ Created index: status
   ...

✅ Schema initialization completed!

📊 Total collections: 24

🔌 Disconnected from MongoDB

✨ Done!
```

### When to Run

Run the schema initialization script:

- **First-time setup**: After installing MongoDB
- **New environment**: When setting up a new development/staging/production environment
- **After database reset**: If you've dropped the database and need to recreate it
- **After schema changes**: If new collections or indexes have been added

**Note**: The script is **idempotent** - it's safe to run multiple times. It will:
- Skip collections that already exist
- Skip indexes that already exist
- Only create missing collections and indexes

---

## Database Collections

### Users Collection

**Indexes:**
- `email` (unique) - Fast user lookup by email
- `createdAt` - Sort by registration date
- `role` - Filter by user role
- `isEmailVerified` - Filter verified users
- `emailVerificationToken` (sparse) - Find users by verification token
- `resetPasswordToken` (sparse) - Find users by reset token

### Sessions Collection

**Indexes:**
- `token` (unique) - Fast session lookup
- `userId` - Find all sessions for a user
- `refreshToken` (unique, sparse) - Find session by refresh token
- `expiresAt` (TTL) - Auto-delete expired sessions
- `createdAt` - Sort by creation date
- `userId + createdAt` - Find user sessions sorted by date

**TTL Index**: Sessions automatically expire based on `expiresAt` field.

### Products Collection

**Indexes:**
- `slug` (unique) - Fast product lookup by slug
- `categoryId` - Filter products by category
- `status` - Filter active/inactive products
- `createdAt` - Sort by creation date
- `name + description` (text) - Full-text search
- `sku` (sparse) - Find products by SKU

### Orders Collection

**Indexes:**
- `userId` - Find all orders for a user
- `guestEmail` (sparse) - Find guest orders
- `status` - Filter orders by status
- `placedAt` - Sort by order date
- `razorpayOrderId` (sparse) - Find order by Razorpay ID
- `createdAt` - Sort by creation date
- `userId + status` - Find user orders by status

### Addresses Collection

**Indexes:**
- `userId` - Find all addresses for a user
- `isDefault` - Find default address
- `createdAt` - Sort by creation date
- `userId + isDefault` - Find user's default address

### Support Tickets Collection

**Indexes:**
- `userId` - Find all tickets for a user
- `status` - Filter tickets by status
- `priority` - Filter tickets by priority
- `createdAt` - Sort by creation date
- `userId + status` - Find user tickets by status

### Audit Logs Collection

**Indexes:**
- `actorId` - Find logs by user
- `action` - Filter by action type
- `createdAt` (TTL: 1 year) - Auto-delete old logs
- `actorId + createdAt` - Find user logs sorted by date
- `action + createdAt` - Find action logs sorted by date

**TTL Index**: Audit logs automatically expire after 1 year.

---

## Indexes

### Index Types

1. **Single Field Indexes**: Fast lookups on single fields
   - Example: `{ email: 1 }`

2. **Compound Indexes**: Optimize queries on multiple fields
   - Example: `{ userId: 1, createdAt: -1 }`

3. **Unique Indexes**: Ensure data uniqueness
   - Example: `{ email: 1 }` with `unique: true`

4. **Sparse Indexes**: Only index documents with the field
   - Example: `{ resetPasswordToken: 1 }` with `sparse: true`

5. **Text Indexes**: Full-text search capabilities
   - Example: `{ name: 'text', description: 'text' }`

6. **TTL Indexes**: Auto-delete documents after expiration
   - Example: `{ expiresAt: 1 }` with `expireAfterSeconds: 0`

### Index Best Practices

- **Query Patterns**: Indexes match common query patterns
- **Write Performance**: Too many indexes can slow writes
- **Memory Usage**: Indexes consume memory
- **Unique Constraints**: Use unique indexes for data integrity

---

## Troubleshooting

### Error: Cannot connect to MongoDB

**Solution:**
1. Check MongoDB is running:
   ```bash
   # Docker
   docker compose ps mongo
   
   # Native
   sudo systemctl status mongod  # Linux
   brew services list | grep mongodb  # Mac
   ```

2. Check `MONGODB_URI` in `.env`:
   ```bash
   cat .env | grep MONGO
   ```

3. Test connection:
   ```bash
   # Docker
   docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
   
   # Native
   mongosh mongodb://localhost:27017/miniecom
   ```

### Error: Index already exists

**Solution:** This is normal. The script skips existing indexes. If you see this message, the index is already created.

### Error: Collection already exists

**Solution:** This is normal. The script skips existing collections. If you see this message, the collection is already created.

### Error: TypeScript compilation errors

**Solution:**
1. Install dependencies:
   ```bash
   cd scripts
   npm install
   ```

2. Check TypeScript configuration:
   ```bash
   cat scripts/tsconfig.json
   ```

3. Run with explicit project path:
   ```bash
   npx ts-node --project scripts/tsconfig.json scripts/init_mongodb_schema.ts
   ```

### Index Creation Fails

**Solution:**
1. Check MongoDB logs for detailed error
2. Verify index definition is correct
3. Drop existing index if needed:
   ```bash
   mongosh
   use miniecom
   db.collection_name.dropIndex("index_name")
   ```

### TTL Index Not Working

**Solution:**
1. Verify `expiresAt` field exists in documents
2. Check TTL index is created:
   ```bash
   mongosh
   use miniecom
   db.sessions.getIndexes()
   ```
3. MongoDB TTL cleanup runs every 60 seconds

---

## Manual Index Management

### View All Indexes

```bash
mongosh mongodb://localhost:27017/miniecom

# List all indexes for a collection
db.collection_name.getIndexes()

# List all collections
show collections
```

### Create Index Manually

```bash
mongosh mongodb://localhost:27017/miniecom

# Create single field index
db.collection_name.createIndex({ field: 1 })

# Create unique index
db.collection_name.createIndex({ field: 1 }, { unique: true })

# Create compound index
db.collection_name.createIndex({ field1: 1, field2: -1 })

# Create TTL index
db.collection_name.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

### Drop Index

```bash
mongosh mongodb://localhost:27017/miniecom

# Drop by name
db.collection_name.dropIndex("index_name")

# Drop all indexes (except _id)
db.collection_name.dropIndexes()
```

---

## Related Documentation

- [Developer Guide](developer_guide.md) - Development workflow
- [Setup Quickstart](setup_quickstart.md) - Initial setup
- [Native Install](native_install.md) - Installing without Docker
- [Troubleshooting](troubleshooting.md) - Common issues

---

**Last Updated**: 2024-01-XX


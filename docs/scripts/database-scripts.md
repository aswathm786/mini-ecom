# Database Scripts

Scripts for database initialization, migrations, and seeding.

## 📋 Available Scripts

### 1. init_mongodb_schema.ts / init_schema.sh / init_schema.ps1

**Purpose:** Initialize MongoDB collections and indexes

**Location:** 
- `scripts/init_mongodb_schema.ts`
- `scripts/init_schema.sh` (Linux/Mac wrapper)
- `scripts/init_schema.ps1` (Windows wrapper)

**When to use:**
- First-time setup
- After fresh MongoDB install
- When collections need to be recreated

**Linux/Mac:**
```bash
# Direct execution
npx ts-node --project scripts/tsconfig.json scripts/init_mongodb_schema.ts

# Using wrapper script
chmod +x scripts/init_schema.sh
bash scripts/init_schema.sh
```

**Windows (PowerShell):**
```powershell
# Direct execution
npx ts-node --project scripts/tsconfig.json scripts/init_mongodb_schema.ts

# Using wrapper script
.\scripts\init_schema.ps1
```

**What it does:**
- Creates all required MongoDB collections
- Creates indexes for performance
- Sets up database constraints
- Validates schema structure

**Output:**
```
Creating collections...
✓ users collection created
✓ products collection created
✓ orders collection created
...
Creating indexes...
✓ users_email_idx created
✓ products_slug_idx created
...
Schema initialization complete!
```

---

### 2. migrate.sh

**Purpose:** Run database migrations

**Location:** `scripts/migrate.sh`

**When to use:**
- After pulling code updates
- When database schema changes
- During deployment

**Linux/Mac:**
```bash
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

**Windows (PowerShell):**
```powershell
# Requires Git Bash or WSL
bash scripts/migrate.sh

# OR using WSL
wsl bash scripts/migrate.sh
```

**What it does:**
- Checks for pending migrations
- Runs migrations in order
- Tracks completed migrations
- Handles errors gracefully

**Migration files location:** `backend/migrations/`

**Migration file format:**
```
20240101000000_description.js
```

**Output:**
```
Checking for pending migrations...
Found 3 pending migrations

Running: 20240101000000_add_status_field
✓ Migration complete

Running: 20240102000000_create_index
✓ Migration complete

Running: 20240103000000_update_prices
✓ Migration complete

All migrations completed successfully!
```

**Create new migration:**
```bash
# Linux/Mac
touch backend/migrations/$(date +%Y%m%d%H%M%S)_description.js

# Windows (PowerShell)
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
New-Item -Path "backend/migrations/${timestamp}_description.js"
```

---

### 3. seed_admin.js

**Purpose:** Create initial admin user

**Location:** `scripts/seed_admin.js`

**When to use:**
- First-time setup
- After database reset
- To recreate admin account

**All Platforms:**
```bash
node scripts/seed_admin.js
```

**Prerequisites:**
- `.env` file configured
- `ADMIN_EMAIL` set
- `ADMIN_PASSWORD` set
- MongoDB running

**What it does:**
- Reads admin credentials from `.env`
- Creates admin user if not exists
- Assigns admin role
- Hashes password securely

**Output:**
```
Connecting to database...
✓ Connected

Checking for existing admin...
Creating admin user...

Admin user created successfully!
Email: admin@yourstore.com
Role: admin

You can now login to the admin panel.
```

**Troubleshooting:**

**"Admin already exists":**
```bash
# Delete and recreate
node scripts/seed_admin.js --force
```

**"Cannot connect to database":**
- Check MongoDB is running
- Verify MONGO_URI in `.env`
- Test connection: `mongosh $MONGO_URI`

---

### 4. seed_sample_data.sh

**Purpose:** Add sample products and data for testing

**Location:** `scripts/seed_sample_data.sh`

**When to use:**
- Development/testing
- Demo setup
- Initial store population

**Linux/Mac:**
```bash
chmod +x scripts/seed_sample_data.sh
./scripts/seed_sample_data.sh
```

**Windows (PowerShell):**
```powershell
bash scripts/seed_sample_data.sh
# OR
wsl bash scripts/seed_sample_data.sh
```

**What it adds:**
- Sample categories (5-10)
- Sample products (20-50)
- Sample images
- Sample reviews (optional)

**Options:**
```bash
# Skip if data exists
./scripts/seed_sample_data.sh --skip-existing

# Force overwrite
./scripts/seed_sample_data.sh --force

# Products only
./scripts/seed_sample_data.sh --products-only
```

**Output:**
```
Seeding sample data...

Creating categories...
✓ Handmade Jewelry
✓ Art & Paintings
✓ Home Decor
...

Creating products...
✓ Ceramic Mug
✓ Handmade Candle
✓ Knitted Scarf
...

Sample data seeded successfully!
Products: 50
Categories: 10
```

---

### 5. seed_products.ts

**Purpose:** Bulk import products from JSON/CSV

**Location:** `scripts/seed_products.ts`

**When to use:**
- Importing existing catalog
- Bulk product upload
- Migrating from another platform

**All Platforms:**
```bash
npx ts-node scripts/seed_products.ts --file products.csv
```

**CSV Format:**
```csv
name,description,price,category,image_url
"Ceramic Mug","Handcrafted ceramic mug",25.00,"Home Decor","https://..."
"Wooden Bowl","Hand-turned wooden bowl",45.00,"Kitchenware","https://..."
```

**Options:**
```bash
# From CSV
npx ts-node scripts/seed_products.ts --file products.csv

# From JSON
npx ts-node scripts/seed_products.ts --file products.json --format json

# Dry run (preview only)
npx ts-node scripts/seed_products.ts --file products.csv --dry-run
```

---

## 🔄 Complete Setup Workflow

### Initial Setup

**Linux/Mac:**
```bash
# 1. Initialize schema
bash scripts/init_schema.sh

# 2. Run migrations
bash scripts/migrate.sh

# 3. Create admin user
node scripts/seed_admin.js

# 4. (Optional) Add sample data
bash scripts/seed_sample_data.sh
```

**Windows (PowerShell):**
```powershell
# 1. Initialize schema
.\scripts\init_schema.ps1

# 2. Run migrations
bash scripts/migrate.sh

# 3. Create admin user
node scripts/seed_admin.js

# 4. (Optional) Add sample data
bash scripts/seed_sample_data.sh
```

### After Code Update

```bash
# Run pending migrations
bash scripts/migrate.sh
```

### Reset Database

⚠️ **Warning:** This will delete all data!

**Linux/Mac:**
```bash
# Drop database
mongosh $MONGO_URI --eval "db.dropDatabase()"

# Reinitialize
bash scripts/init_schema.sh
bash scripts/migrate.sh
node scripts/seed_admin.js
```

**Windows (PowerShell):**
```powershell
# Drop database
mongosh $env:MONGO_URI --eval "db.dropDatabase()"

# Reinitialize
.\scripts\init_schema.ps1
bash scripts/migrate.sh
node scripts/seed_admin.js
```

---

## 🐛 Troubleshooting

### "MongoDB connection refused"

**Check MongoDB status:**

**Linux:**
```bash
sudo systemctl status mongod
```

**Windows:**
```powershell
Get-Service MongoDB
```

**Start MongoDB:**

**Linux:**
```bash
sudo systemctl start mongod
```

**Windows:**
```powershell
Start-Service MongoDB
```

### "Migration failed"

**View migration logs:**
```bash
cat storage/logs/migrations.log
```

**Rollback last migration:**
```bash
# Edit migration file to add down() method
# Then manually rollback
mongosh $MONGO_URI
```

### "Admin creation failed"

**Check credentials:**
```bash
# Verify .env has required fields
grep -E "ADMIN_EMAIL|ADMIN_PASSWORD" .env
```

**Manual admin creation:**
```javascript
// In mongosh
use miniecom
db.users.insertOne({
  email: "admin@example.com",
  password: "$argon2id$...", // Use hashed password
  role: "admin",
  createdAt: new Date()
})
```

---

## 📚 Related Documentation

- [Backup & Restore](backup-restore.md)
- [Maintenance Scripts](maintenance-scripts.md)
- [Operations Guide](../operations/README.md)


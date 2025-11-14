#!/bin/bash

# Seed Sample Data Script
# Inserts sample categories, products, and users into MongoDB

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/storage/logs/ops.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

MONGO_URI="${MONGO_URI:-mongodb://admin:changeme@localhost:27017/miniecom?authSource=admin}"
SEED_SCRIPT="${PROJECT_ROOT}/backend/scripts/seed_sample_data.js"

if [ ! -f "$SEED_SCRIPT" ]; then
    log "ERROR: Seed script not found: $SEED_SCRIPT"
    log "Creating sample seed script..."
    
    # Create a basic seed script if it doesn't exist
    cat > "$SEED_SCRIPT" << 'EOF'
// Sample data seed script
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:changeme@localhost:27017/miniecom?authSource=admin';

async function seed() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        const db = client.db();
        
        // Seed categories
        const categories = [
            { slug: 'handmade-jewelry', name: 'Handmade Jewelry', description: 'Unique handmade jewelry pieces' },
            { slug: 'artisan-crafts', name: 'Artisan Crafts', description: 'Beautiful artisan crafts' },
            { slug: 'home-decor', name: 'Home Decor', description: 'Decorative items for your home' },
        ];
        
        for (const category of categories) {
            await db.collection('categories').updateOne(
                { slug: category.slug },
                { $set: category },
                { upsert: true }
            );
        }
        
        console.log('Categories seeded successfully');
        
        // Seed products
        const products = [
            {
                slug: 'handmade-necklace-001',
                name: 'Handmade Silver Necklace',
                description: 'Beautiful handmade silver necklace',
                price: 2999,
                stock: 10,
                category: 'handmade-jewelry',
                status: 'active',
            },
            {
                slug: 'artisan-pottery-001',
                name: 'Artisan Pottery Bowl',
                description: 'Handcrafted pottery bowl',
                price: 1499,
                stock: 5,
                category: 'artisan-crafts',
                status: 'active',
            },
        ];
        
        for (const product of products) {
            await db.collection('products').updateOne(
                { slug: product.slug },
                { $set: { ...product, createdAt: new Date(), updatedAt: new Date() } },
                { upsert: true }
            );
        }
        
        console.log('Products seeded successfully');
        
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

seed();
EOF
    chmod +x "$SEED_SCRIPT"
fi

log "Starting sample data seeding..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log "ERROR: Node.js not found. Please install Node.js."
    exit 1
fi

# Run seed script
if node "$SEED_SCRIPT"; then
    log "Sample data seeded successfully"
else
    log "ERROR: Failed to seed sample data"
    exit 1
fi


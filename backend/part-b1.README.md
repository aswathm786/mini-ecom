# Part B.1 - E-commerce API: Catalog, Cart & Orders

This document describes the e-commerce core APIs implemented in Part B.1.

## Overview

Part B.1 implements the core e-commerce functionality:
- **Catalog**: Categories and products with image uploads
- **Cart**: Shopping cart management for authenticated and anonymous users
- **Orders**: Checkout flow with inventory reservation
- **Admin**: Product CRUD, order management, refunds

## API Endpoints

### Public Catalog

#### Categories
- `GET /api/categories` - List all categories
  - Query params: `parent` (filter by parent category)
- `GET /api/categories/:slug` - Get category by slug

#### Products
- `GET /api/products` - List products
  - Query params:
    - `q` - Search query
    - `category` - Filter by category ID
    - `page` - Page number (default: 1)
    - `limit` - Items per page (default: 20, max: 100)
    - `status` - Filter by status (default: active)
  - Returns: `{ ok: true, data: products[], meta: { page, limit, total, pages } }`
- `GET /api/products/:slug` - Get product by slug with inventory

### Cart

All cart endpoints support both authenticated users (stored in DB) and anonymous users (session-based).

- `GET /api/cart` - Get current cart
- `POST /api/cart/add` - Add item to cart
  - Body: `{ productId: string, qty: number }`
  - Requires: CSRF token
- `POST /api/cart/update` - Update item quantity
  - Body: `{ productId: string, qty: number }`
  - Requires: CSRF token
- `POST /api/cart/remove` - Remove item from cart
  - Body: `{ productId: string }`
  - Requires: CSRF token
- `POST /api/cart/clear` - Clear entire cart
  - Requires: CSRF token

### Orders

- `POST /api/checkout` - Create order from cart
  - Body:
    ```json
    {
      "payment_method": "razorpay" | "cod" | "other",
      "shipping_address": {
        "name": "string",
        "street": "string",
        "city": "string",
        "state": "string",
        "pincode": "string",
        "country": "string",
        "phone": "string (optional)"
      },
      "billing_address": { ... } // Optional, defaults to shipping_address
    }
    ```
  - Requires: Authentication, CSRF token
  - Returns: `{ ok: true, data: { order, payment, nextSteps } }`
- `GET /api/orders/:id` - Get order details
  - Requires: Authentication (user can only see own orders, admin can see all)

### Admin

All admin endpoints require authentication, admin role, and CSRF protection.

#### Products
- `POST /api/admin/products` - Create product
  - Content-Type: `multipart/form-data`
  - Fields:
    - `name` (required)
    - `description` (required)
    - `price` (required, number)
    - `sku` (optional)
    - `categoryId` (optional)
    - `status` (optional: active|inactive|draft)
    - `qty` (optional, for inventory)
    - `lowStockThreshold` (optional, default: 10)
    - `images` (optional, up to 5 files)
- `PUT /api/admin/products/:id` - Update product
  - Same fields as create
  - `removeImages` (optional, array of filenames to remove)
- `DELETE /api/admin/products/:id` - Delete product
  - Query param: `hard=true` for hard delete (default: soft delete)

#### Orders
- `GET /api/admin/orders` - List orders
  - Query params: `userId`, `status`, `page`, `limit`
- `POST /api/admin/orders/:id/refund` - Create refund
  - Body: `{ amount?: number, reason: string }`
  - If `amount` not provided, full refund is created

#### User Sessions (Placeholder)
- `GET /api/admin/users/:id/sessions` - List user sessions
- `POST /api/admin/users/:id/revoke-session` - Revoke session
  - Body: `{ sessionId: string }`

## File Uploads

- Uploaded files are stored in `./uploads` (configurable via `UPLOADS_PATH`)
- Files are served at `/api/uploads/:filename`
- Supported formats: JPEG, PNG, WebP, GIF
- Max file size: 10MB (configurable via `MAX_FILE_SIZE`)
- Filenames are randomized: `<timestamp>_<randomhex>.<ext>`

## Inventory Management

- Inventory is stored in `inventory` collection
- Stock levels are checked before adding to cart
- Inventory is atomically decremented during checkout using `findOneAndUpdate`
- If insufficient stock, checkout fails with 409 status
- **Note**: For production, consider using MongoDB transactions or a reservation system

## Database Collections

### Categories
```typescript
{
  _id: ObjectId,
  name: string,
  slug: string,
  description?: string,
  parentId?: string,
  sortOrder: number,
  createdAt: Date
}
```

### Products
```typescript
{
  _id: ObjectId,
  name: string,
  slug: string,
  description: string,
  price: number,
  sku?: string,
  status: 'active' | 'inactive' | 'draft',
  categoryId?: string,
  images: Array<{ filename: string, url: string, alt?: string }>,
  createdAt: Date,
  updatedAt: Date
}
```

### Inventory
```typescript
{
  _id: ObjectId,
  productId: ObjectId,
  qty: number,
  lowStockThreshold: number,
  updatedAt: Date
}
```

### Carts
```typescript
{
  _id: ObjectId,
  userId?: string,      // For authenticated users
  sessionId?: string,  // For anonymous users
  items: Array<{
    productId: string,
    qty: number,
    priceAt: number,
    name?: string
  }>,
  updatedAt: Date
}
```

### Orders
```typescript
{
  _id: ObjectId,
  userId: string,
  items: Array<{
    productId: string,
    qty: number,
    priceAt: number,
    name: string
  }>,
  amount: number,
  currency: string,
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded',
  shippingAddress: Address,
  billingAddress: Address,
  placedAt: Date,
  razorpayOrderId?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Payments
```typescript
{
  _id: ObjectId,
  orderId: string,
  amount: number,
  currency: string,
  gateway: 'razorpay' | 'cod' | 'other',
  gateway_order_id?: string,
  gateway_payment_id?: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  meta?: Record<string, any>,
  createdAt: Date,
  updatedAt: Date
}
```

### Refunds
```typescript
{
  _id: ObjectId,
  paymentId: string,
  orderId: string,
  amount: number,
  initiatedBy: string, // userId
  status: 'requested' | 'processing' | 'completed' | 'failed',
  reason: string,
  createdAt: Date
}
```

## MongoDB Indexes

Recommended indexes for performance:

```javascript
// Products
db.products.createIndex({ slug: 1 }, { unique: true });
db.products.createIndex({ categoryId: 1 });
db.products.createIndex({ status: 1 });
db.products.createIndex({ name: 'text', description: 'text' }); // Text search

// Categories
db.categories.createIndex({ slug: 1 }, { unique: true });
db.categories.createIndex({ parentId: 1 });

// Inventory
db.inventory.createIndex({ productId: 1 }, { unique: true });
db.inventory.createIndex({ qty: 1 }); // For low stock queries

// Orders
db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ placedAt: -1 });

// Carts
db.carts.createIndex({ userId: 1 });
db.carts.createIndex({ sessionId: 1 });
```

## Seed Data

Run the seed script to populate sample data:

```bash
# Using ts-node
ts-node scripts/seed_products.ts

# Or after compilation
node scripts/seed_products.js
```

This creates:
- 3 categories (Home Decor, Kitchen & Dining, Accessories)
- 6 sample products
- Inventory records for all products

## Testing

Run the integration test:

```bash
npm test -- test/b1_checkout.test.ts
```

Note: The test script uses Jest. Ensure the test file path is correct relative to the project root.

The test verifies:
- Product creation
- Adding items to cart
- Checkout flow
- Inventory decrement
- Order and payment creation

## Development Checklist

1. ✅ Install dependencies: `npm install` (adds multer)
2. ✅ Ensure MongoDB is running
3. ✅ Run seed script: `ts-node scripts/seed_products.ts`
4. ✅ Start backend: `npm run dev`
5. ✅ Test endpoints using Postman or curl

## Example API Calls

### Create Product (Admin)
```bash
curl -X POST http://localhost:5000/api/admin/products \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <token>" \
  -F "name=Test Product" \
  -F "description=Test description" \
  -F "price=1000" \
  -F "qty=50" \
  -F "images=@/path/to/image.jpg"
```

### Add to Cart
```bash
curl -X POST http://localhost:5000/api/cart/add \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{"productId": "<id>", "qty": 2}'
```

### Checkout
```bash
curl -X POST http://localhost:5000/api/checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{
    "payment_method": "cod",
    "shipping_address": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    }
  }'
```

## Notes

- **Concurrency**: Current inventory reservation uses atomic MongoDB operations. For high-traffic scenarios, consider implementing a reservation/locking mechanism or MongoDB transactions.
- **File Storage**: Uploaded files are stored locally. For production, consider using cloud storage (S3, Cloudinary, etc.).
- **Session Management**: Anonymous cart uses sessionId. Full session management will be implemented in later parts.
- **Refunds**: Refund creation is a placeholder. Actual payment gateway refund processing will be implemented in later parts.

## Git Commit

```bash
git add .
git commit -m "B.1: products, categories, cart, checkout APIs (Mongo)"
git push origin feature/backend-ecommerce
```


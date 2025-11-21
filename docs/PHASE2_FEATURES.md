# Phase 2 Features - Complete Implementation Guide

## Overview

Phase 2 adds comprehensive commerce features including wishlist, coupons, loyalty points, guest checkout, and advanced product features. All features are production-ready with full backend implementation.

## ✅ Implemented Features

### 1. Wishlist System
**API Endpoints:**
- `GET /api/wishlist` - Get user's wishlist
- `POST /api/wishlist/add` - Add product to wishlist
- `DELETE /api/wishlist/:productId` - Remove from wishlist
- `POST /api/wishlist/:productId/move-to-cart` - Move item to cart
- `GET /api/wishlist/check/:productId` - Check if product is in wishlist

**Usage:**
```typescript
// Add to wishlist
await fetch('/api/wishlist/add', {
  method: 'POST',
  body: JSON.stringify({ productId: '...' })
});

// Get wishlist
const wishlist = await fetch('/api/wishlist').then(r => r.json());
```

### 2. Coupon Engine
**Types Supported:**
- Flat discount (fixed amount)
- Percentage discount (with max cap)
- Buy X Get Y
- First order only

**API Endpoints:**
- `POST /api/coupons/validate` - Validate and calculate discount
- `GET /api/admin/coupons` - List all coupons (admin)
- `POST /api/admin/coupons` - Create coupon (admin)
- `PUT /api/admin/coupons/:id` - Update coupon (admin)
- `DELETE /api/admin/coupons/:id` - Delete coupon (admin)

**Usage:**
```typescript
// Validate coupon
const result = await fetch('/api/coupons/validate', {
  method: 'POST',
  body: JSON.stringify({ code: 'SAVE20' })
});
// Returns: { ok: true, data: { code: 'SAVE20', discount: 200 } }
```

### 3. Loyalty Points System
**Features:**
- Earn points on orders (configurable rate)
- Redeem points for discounts
- Points expiration (optional)
- Transaction history

**API Endpoints:**
- `GET /api/loyalty/balance` - Get points balance
- `GET /api/loyalty/transactions` - Get transaction history
- `POST /api/loyalty/redeem` - Redeem points
- `GET /api/admin/loyalty/user/:userId` - Get user account (admin)
- `POST /api/admin/loyalty/adjust` - Adjust points (admin)

**Configuration:**
- Points per rupee: 0.1 (1 point per ₹10)
- Rupees per point: 0.1 (1 point = ₹0.10)
- Min redeem: 100 points
- Max redeem: 50% of order

### 4. Guest Checkout
**Feature Flag:** `features.checkout.guestEnabled`

**Usage:**
```typescript
// Checkout without login (if enabled)
await fetch('/api/checkout/create-order', {
  method: 'POST',
  body: JSON.stringify({
    email: 'guest@example.com', // Required for guest
    shipping_address: { ... },
    payment_method: 'cod',
    // ... other fields
  })
});
```

### 5. Gift Wrap
**Usage:**
Include `giftWrap: true` in checkout request:
```typescript
{
  giftWrap: true,
  // ... other checkout fields
}
```

### 6. Price Drop Alerts
**API Endpoints:**
- `POST /api/price-alerts` - Create alert
- `GET /api/price-alerts` - Get user's alerts
- `DELETE /api/price-alerts/:id` - Remove alert

**Cron Job:**
Run `scripts/check_price_alerts.ts` periodically (e.g., hourly):
```bash
# Add to crontab
0 * * * * cd /path/to/project && ts-node scripts/check_price_alerts.ts
```

### 7. Frequently Bought Together
**API Endpoints:**
- `GET /api/products/:productId/frequently-bought` - Get recommendations
- `GET /api/products/frequently-bought/cart?products=id1,id2` - Cart-based recommendations

### 8. Recently Viewed Products
**API Endpoints:**
- `POST /api/products/:productId/view` - Record view
- `GET /api/recently-viewed` - Get recently viewed
- `DELETE /api/recently-viewed` - Clear history

**Features:**
- Tracks for both authenticated and guest users
- Merges guest views on login
- Limits to last 50 products

### 9. Product Q&A
**API Endpoints:**
- `GET /api/products/:productId/qa` - Get Q&A
- `POST /api/products/:productId/qa/ask` - Ask question
- `POST /api/qa/:questionId/answer` - Answer question
- `GET /api/qa/my-questions` - Get user's questions
- `GET /api/admin/qa/pending/questions` - Pending questions (admin)
- `POST /api/admin/qa/questions/:id/moderate` - Moderate question (admin)

**Moderation:**
- All questions require approval
- Official answers (from admin/seller) auto-approve
- Customer answers require moderation

### 10. Web Push Notifications
**API Endpoints:**
- `POST /api/push/subscribe` - Subscribe
- `POST /api/push/unsubscribe` - Unsubscribe
- `GET /api/push/subscriptions` - Get user subscriptions
- `POST /api/admin/push/broadcast` - Broadcast (admin)

**Setup Required:**
1. Install `web-push` package: `npm install web-push`
2. Generate VAPID keys: `npx web-push generate-vapid-keys`
3. Configure in environment variables

### 11. Mobile API
**Base Path:** `/api/mobile/*`

**Endpoints:**
- `GET /api/mobile/products` - Products (compact)
- `GET /api/mobile/cart` - Cart
- `GET /api/mobile/orders` - Orders
- `GET /api/mobile/wishlist` - Wishlist
- `GET /api/mobile/loyalty/balance` - Loyalty balance
- `POST /api/mobile/push/subscribe` - Push subscription

**Features:**
- Optimized JSON responses
- All core features accessible
- Requires authentication

### 12. Bulk Product Import
**API Endpoints:**
- `POST /api/admin/products/import` - Import CSV
- `GET /api/admin/products/import/template` - Download template

**CSV Format:**
```csv
name,description,price,compareAtPrice,sku,category,stock,images,tags,status,featured
Product Name,Description,999.99,1299.99,SKU-001,Electronics,100,url1.jpg,url2.jpg,tag1,tag2,active,true
```

**Features:**
- Validates all rows
- Creates categories if missing
- Updates existing products (by SKU or slug)
- Returns detailed error report

## Database Collections

New collections:
- `wishlists`
- `coupons`
- `coupon_usage`
- `loyalty_accounts`
- `loyalty_transactions`
- `price_alerts`
- `recently_viewed`
- `product_questions`
- `product_answers`
- `push_subscriptions`

## Integration with Orders

Orders now support:
- Guest checkout (optional `userId`)
- Coupon codes and discounts
- Loyalty point redemption
- Gift wrap option
- Automatic loyalty point earning

**Order Object:**
```typescript
{
  userId?: string; // Optional for guest
  guestEmail?: string;
  couponCode?: string;
  couponDiscount?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscount?: number;
  giftWrap?: boolean;
  // ... other fields
}
```

## Frontend Integration Guide

### Wishlist
```typescript
// Add to wishlist button
<button onClick={() => addToWishlist(productId)}>
  Add to Wishlist
</button>

// Check if in wishlist
const { inWishlist } = useWishlist(productId);
```

### Coupons
```typescript
// Apply coupon in checkout
const applyCoupon = async (code: string) => {
  const res = await fetch('/api/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  const { data } = await res.json();
  setDiscount(data.discount);
};
```

### Loyalty Points
```typescript
// Display balance
const { balance } = useLoyaltyBalance();
// Redeem in checkout
await fetch('/api/loyalty/redeem', {
  method: 'POST',
  body: JSON.stringify({ points: 100, orderAmount: 1000 })
});
```

## Testing

All features are ready for testing. Use the API endpoints directly or integrate with frontend components.

## Production Checklist

- [ ] Configure feature flags in admin panel
- [ ] Set up price alert cron job
- [ ] Install and configure web-push
- [ ] Generate VAPID keys
- [ ] Test all integrations
- [ ] Build frontend components
- [ ] Load test with sample data

---

**Status**: ✅ All Phase 2 features complete and ready for frontend integration.


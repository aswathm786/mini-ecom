# Admin Settings & Feature Flags Documentation

## Overview

The e-commerce platform includes a comprehensive feature flag and settings management system that allows administrators to enable/disable features at runtime without code changes. All settings are stored in MongoDB and cached for performance.

## Architecture

### Settings Storage

- **Collection**: `settings` in MongoDB
- **Structure**: Key-value pairs with type information
- **Caching**: 1-minute TTL cache for performance
- **Invalidation**: Automatic on updates

### Feature Flags Structure

Feature flags are organized hierarchically:

```typescript
{
  features: {
    deliveryProviders: { delhivery: { enabled }, bluedart: { enabled }, dtdc: { enabled } },
    payments: { razorpay: { enabled }, cod: { enabled }, wallet: { enabled } },
    email: { enabled, marketing: { enabled }, transactional: { enabled }, ... },
    theme: { enabled },
    reviews: { enabled, requireModeration },
    wishlist: { enabled },
    coupons: { enabled, types: { ... } },
    loyalty: { enabled, rules: { ... } },
    checkout: { guestEnabled },
    returns: { enabled, windowDays, autoApprove },
    notifications: { webpush: { enabled } },
    search: { semantic: { enabled }, autocomplete: { enabled }, trending: { enabled } },
    recommendations: { ai: { enabled } },
    ai: { chat: { enabled }, admin: { ... } },
    tools: { bulkImport: { enabled } },
    security: { fraud: { enabled }, adminIpWhitelist: { enabled }, '2fa': { ... } }
  },
  site: { maintenance: { enabled, message, whitelistIps } },
  shipping: { providers: { ... } },
  payments: { methods: { ... } },
  cdn: { enabled, provider, config },
  backups: { enabled, retentionDays },
  monitoring: { enabled, prometheus: { enabled } },
  privacy: { export: { enabled }, deletion: { enabled } }
}
```

## API Endpoints

### Admin Settings Endpoints

All admin endpoints require authentication, admin role, and CSRF protection.

#### Shipping Settings

- `GET /api/admin/settings/shipping` - Get shipping provider settings
- `PATCH /api/admin/settings/shipping` - Update shipping provider
  ```json
  {
    "provider": "delhivery" | "bluedart" | "dtdc",
    "enabled": true,
    "config": {}
  }
  ```

#### Payment Settings

- `GET /api/admin/settings/payments` - Get payment method settings
- `PATCH /api/admin/settings/payments` - Update payment method
  ```json
  {
    "method": "razorpay" | "cod" | "wallet",
    "enabled": true
  }
  ```

#### Email Settings

- `GET /api/admin/settings/email` - Get email settings
- `PATCH /api/admin/settings/email` - Update email settings
  ```json
  {
    "enabled": true,
    "marketing": { "enabled": true },
    "transactional": { "enabled": true },
    "productLaunch": { "enabled": true },
    "announcements": { "enabled": true }
  }
  ```

#### Theme Settings

- `GET /api/admin/settings/theme` - Get theme settings
- `PATCH /api/admin/settings/theme` - Update theme settings
  ```json
  {
    "enabled": true
  }
  ```

#### Review Settings

- `GET /api/admin/settings/reviews` - Get review settings
- `PATCH /api/admin/settings/reviews` - Update review settings
  ```json
  {
    "enabled": true,
    "requireModeration": false
  }
  ```

#### Security Settings

- `GET /api/admin/settings/security` - Get security settings
- `PATCH /api/admin/settings/security/2fa` - Update 2FA settings
- `PATCH /api/admin/settings/security/ip-whitelist` - Update IP whitelist
- `PATCH /api/admin/settings/security/fraud` - Update fraud detection

#### Infrastructure Settings

- `GET /api/admin/settings/maintenance` - Get maintenance mode settings
- `PATCH /api/admin/settings/maintenance` - Update maintenance mode
- `GET /api/admin/settings/cdn` - Get CDN settings
- `PATCH /api/admin/settings/cdn` - Update CDN settings
- `POST /api/admin/settings/cdn/purge` - Purge CDN cache
- `GET /api/admin/settings/backups` - Get backup settings
- `PATCH /api/admin/settings/backups` - Update backup settings
- `POST /api/admin/settings/backups/trigger` - Trigger manual backup
- `GET /api/admin/settings/monitoring` - Get monitoring settings
- `PATCH /api/admin/settings/monitoring` - Update monitoring settings
- `GET /api/admin/settings/privacy` - Get privacy settings
- `PATCH /api/admin/settings/privacy` - Update privacy settings

#### Commerce Settings

- `PATCH /api/admin/settings/commerce/wishlist` - Update wishlist toggle
- `PATCH /api/admin/settings/commerce/coupons` - Update coupon settings
- `PATCH /api/admin/settings/commerce/loyalty` - Update loyalty settings
- `PATCH /api/admin/settings/commerce/guest-checkout` - Update guest checkout
- `PATCH /api/admin/settings/commerce/returns` - Update returns settings

#### AI Settings

- `GET /api/admin/settings/ai` - Get AI settings
- `PATCH /api/admin/settings/ai` - Update AI settings
- `GET /api/admin/settings/ai/search` - Get search settings
- `PATCH /api/admin/settings/ai/search` - Update search settings
- `GET /api/admin/settings/ai/recommendations` - Get recommendations settings
- `PATCH /api/admin/settings/ai/recommendations` - Update recommendations settings

#### Notification Settings

- `GET /api/admin/settings/notifications` - Get notification settings
- `PATCH /api/admin/settings/notifications` - Update notification settings

#### Tools Settings

- `GET /api/admin/settings/tools` - Get tools settings
- `PATCH /api/admin/settings/tools` - Update tools settings

#### Feature Flags (Centralized)

- `GET /api/admin/settings/feature-flags` - Get all feature flags
- `PATCH /api/admin/settings/feature-flags` - Update feature flags (bulk)

### Public Settings Endpoints

These endpoints are accessible without authentication and return only public-safe information.

- `GET /api/settings/shipping/available` - Get available shipping providers
- `GET /api/settings/payments` - Get available payment methods
- `GET /api/settings/email` - Get email settings (public-safe)
- `GET /api/settings/reviews` - Get review settings
- `GET /api/feature-flags` - Get public feature flags

## Backend Enforcement

All services and controllers check feature flags before executing:

### Shipping

- `DelhiveryService.getRates()` - Checks if Delhivery is enabled
- `DelhiveryService.createShipment()` - Checks if Delhivery is enabled
- Routes check provider availability before processing

### Payments

- `OrderController` validates payment method is enabled
- Payment processing routes check flags

### Email

- `EmailTriggerService.sendTemplateEmail()` - Checks email category flags
- Marketing emails respect `email.marketing.enabled`
- Transactional emails are always enabled

### Reviews

- `ReviewController.createReview()` - Checks if reviews are enabled
- Moderation status respects `reviews.requireModeration`

### AI

- `AIController.chat()` - Checks `ai.chat.enabled`
- `AIController.recommend()` - Checks `recommendations.ai.enabled`
- `AIController.semanticSearch()` - Checks `search.semantic.enabled`
- Admin AI tools check respective flags

### Other Features

- Wishlist, Coupons, Loyalty, Returns, Web Push, Bulk Import all check flags
- Guest checkout validates `checkout.guestEnabled`
- Maintenance mode middleware blocks non-admin requests

## Middleware

### Feature Flag Guard

```typescript
import { featureFlagGuard } from '../middleware/FeatureFlagGuard';

router.post('/checkout', featureFlagGuard('checkout.guestEnabled'), checkoutController);
```

### Maintenance Mode Guard

Automatically applied to all routes. Checks maintenance mode and allows:
- Admin users
- Whitelisted IPs
- Blocks all other requests with 503

## Frontend Integration

Frontend should fetch public settings on app load:

```typescript
const response = await fetch('/api/feature-flags');
const flags = await response.json();

// Check feature availability
if (flags.data.wishlist?.enabled) {
  // Show wishlist button
}
```

## Scripts

### Seed Default Settings

```bash
npm run seed:settings
# or
ts-node scripts/seed_settings.ts
```

### Run Backup

```bash
./scripts/run_backup.sh
```

Environment variables:
- `BACKUP_DIR` - Backup directory (default: `./backups`)
- `MONGO_HOST` - MongoDB host (default: `localhost`)
- `MONGO_PORT` - MongoDB port (default: `27017`)
- `MONGO_DB` - Database name (default: `ecommerce`)
- `BACKUP_S3_BUCKET` - Optional S3 bucket for uploads
- `BACKUP_RETENTION_DAYS` - Days to keep backups (default: 30)

### Purge CDN

```bash
./scripts/purge_cdn.sh
```

Environment variables:
- `CDN_PROVIDER` - Provider name (`cloudflare` or `aws`)
- `CDN_API_KEY` - API key
- `CDN_ZONE_ID` - Zone/Distribution ID
- `CDN_DISTRIBUTION_ID` - AWS CloudFront distribution ID (for AWS)

## Audit Logging

All settings changes are logged to `admin_audit` collection:

```typescript
{
  action: 'toggle_feature' | 'update_settings',
  feature: 'shipping.delhivery',
  oldValue: false,
  newValue: true,
  adminId: '...',
  ip: '...',
  userAgent: '...',
  timestamp: Date,
  createdAt: Date
}
```

## Best Practices

1. **Default to Disabled**: Features should be disabled by default for security
2. **Transactional Emails**: Always enabled (cannot be disabled)
3. **Graceful Degradation**: Services should handle disabled features gracefully
4. **Cache Invalidation**: Settings are automatically invalidated on update
5. **Audit Everything**: All changes are logged for compliance
6. **Public vs Private**: Only expose safe settings to public endpoints

## Troubleshooting

### Feature Not Working

1. Check if feature flag is enabled: `GET /api/admin/settings/feature-flags`
2. Check audit logs: `GET /api/admin/audit-logs?feature=featureName`
3. Verify cache invalidation: Settings are cached for 1 minute
4. Check service logs for enforcement errors

### Settings Not Updating

1. Verify admin authentication and role
2. Check CSRF token is valid
3. Verify MongoDB connection
4. Check for validation errors in response

## Migration

When adding new features:

1. Add feature flag to `DEFAULT_FEATURE_FLAGS` in `scripts/seed_settings.ts`
2. Add enforcement check in service/controller
3. Add admin UI for toggle
4. Update documentation
5. Run seed script to initialize


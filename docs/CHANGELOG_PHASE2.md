# Phase 2 Changelog

## Feature Flags & Settings Management System

### Added
- **Settings Infrastructure**: Centralized settings model with MongoDB storage and 1-minute TTL caching
- **Admin Audit Service**: Comprehensive audit logging for all settings changes
- **Feature Flag Guard Middleware**: Route-level feature flag enforcement
- **25+ Feature Toggles**: Complete admin control over all major features
- **Public Settings Endpoints**: Safe settings exposure for frontend consumption
- **Maintenance Mode**: Site-wide maintenance mode with IP whitelisting
- **CDN Integration**: CDN settings and purge functionality
- **Backup Management**: Backup settings and manual trigger support
- **Monitoring Toggles**: Prometheus and health check settings
- **Privacy Controls**: GDPR export and deletion toggles
- **Security Settings**: 2FA requirements, IP whitelist, fraud detection
- **Scripts**: Seed settings, backup, and CDN purge scripts

### Changed
- **Service Enforcement**: All services now check feature flags before execution
- **Order Controller**: Validates payment methods and guest checkout flags
- **Email Service**: Respects email category flags (marketing, transactional, etc.)
- **AI Controller**: Checks AI feature flags for chat, search, recommendations, admin tools
- **Shipping Service**: Validates provider availability before processing
- **Review Controller**: Checks review enablement and moderation flags

### Documentation
- Added `docs/admin_settings.md` with complete API documentation
- Updated `docs/IMPLEMENTATION_STATUS.md` with feature flags section
- Added script documentation in README

---

# Phase 2 Changelog

## All Features Implemented ✅

### New Services
1. **WishlistService** - User wishlist management
2. **CouponService** - Discount coupon engine
3. **LoyaltyService** - Loyalty points system
4. **PriceAlertService** - Price drop notifications
5. **FrequentlyBoughtService** - Product recommendations
6. **RecentlyViewedService** - View tracking
7. **ProductQAService** - Q&A system
8. **WebPushService** - Push notifications
9. **BulkImportService** - CSV product import

### New Controllers
1. **WishlistController** - Wishlist API
2. **CouponController** - Coupon API
3. **LoyaltyController** - Loyalty API
4. **PriceAlertController** - Price alerts API
5. **FrequentlyBoughtController** - Recommendations API
6. **RecentlyViewedController** - Recently viewed API
7. **ProductQAController** - Q&A API
8. **WebPushController** - Push API
9. **BulkImportController** - Import API

### Updated Services
- **OrderService** - Added guest checkout, coupons, loyalty, gift wrap support
- **OrderController** - Updated for new checkout features

### New Routes
- `/api/wishlist/*` - Wishlist endpoints
- `/api/coupons/*` - Coupon endpoints
- `/api/loyalty/*` - Loyalty endpoints
- `/api/price-alerts/*` - Price alerts
- `/api/products/:id/frequently-bought` - Recommendations
- `/api/recently-viewed/*` - Recently viewed
- `/api/products/:id/qa/*` - Q&A
- `/api/push/*` - Web push
- `/api/mobile/*` - Mobile API
- `/api/admin/coupons/*` - Admin coupon management
- `/api/admin/qa/*` - Q&A moderation
- `/api/admin/products/import/*` - Bulk import

### New Database Collections
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

### New Scripts
- `scripts/check_price_alerts.ts` - Price alert cron job

### Dependencies Added
- `csv-parse` - For bulk CSV import

### Documentation
- `docs/phase2-complete.md` - Complete feature list
- `docs/PHASE2_FEATURES.md` - API documentation
- `docs/IMPLEMENTATION_STATUS.md` - Overall status
- `docs/CHANGELOG_PHASE2.md` - This file

### Breaking Changes
None - All features are additive.

### Migration Notes
No database migrations required. Collections will be created automatically on first use.

---

**Date**: Phase 2 Complete
**Status**: ✅ All features implemented and ready for frontend integration


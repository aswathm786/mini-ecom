/**
 * Routes
 * 
 * Composes all API routes for the application.
 */

import { Router } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { HealthController } from '../controllers/HealthController';
import { AuthController } from '../controllers/AuthController';
import { WebhookController } from '../controllers/WebhookController';
import { delhiveryService } from '../services/DelhiveryService';
import { csrfTokenHandler, csrfProtection } from '../middleware/CSRF';
import { requireAuth } from '../middleware/Auth';
import { authRateLimiter, publicRateLimiter, generalRateLimiter } from '../middleware/Security';
import { Config } from '../config/Config';
import catalogRoutes from './catalog';
import cartRoutes from './cart';
import orderRoutes from './orders';
import adminRoutes from './admin';
import { SupportTicketController } from '../controllers/SupportTicketController';
import { UserController } from '../controllers/UserController';
import aiRoutes from './ai.routes';
import { AdminThemeController } from '../controllers/AdminThemeController';
import { MarketingController } from '../controllers/MarketingController';
import { SettingsController } from '../controllers/SettingsController';
import { platformSettingsService } from '../services/PlatformSettingsService';
import { AdminSettingsController } from '../controllers/AdminSettingsController';
import { featureFlagGuard } from '../middleware/FeatureFlagGuard';
import mobileRoutes from './mobile';
import { WishlistController } from '../controllers/WishlistController';
import { CouponController } from '../controllers/CouponController';
import { LoyaltyController } from '../controllers/LoyaltyController';
import { PriceAlertController } from '../controllers/PriceAlertController';
import { FrequentlyBoughtController } from '../controllers/FrequentlyBoughtController';
import { RecentlyViewedController } from '../controllers/RecentlyViewedController';
import { ProductQAController } from '../controllers/ProductQAController';
import { WebPushController } from '../controllers/WebPushController';

import { FeatureFlagsController } from '../controllers/admin/FeatureFlagsController';
import { PincodeController } from '../controllers/PincodeController';
import { CountryController } from '../controllers/CountryController';

const router = Router();

// Note: Maintenance mode is already applied in server.ts, no need to apply here

// Health check (no auth required, no rate limiting)
router.get('/health', HealthController.health);

// CSRF token endpoint (no auth required, no CSRF protection, lenient rate limiting)
router.get('/csrf-token', publicRateLimiter, csrfTokenHandler);

// Pincode lookup (public, no auth required)
router.get('/pincode/:pincode', publicRateLimiter, PincodeController.getPincodeData);

// Countries (public, no auth required)
router.get('/countries', publicRateLimiter, CountryController.getEnabledCountries);

// Serve uploaded files
const uploadsPath = path.resolve(Config.get('UPLOAD_DIR', './uploads'));
router.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;

  // Security: prevent directory traversal by resolving path and checking it's within uploads directory
  const requestedPath = path.resolve(path.join(uploadsPath, filename));

  // Ensure the resolved path is still within the uploads directory
  if (!requestedPath.startsWith(uploadsPath)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (!fs.existsSync(requestedPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(requestedPath);
});

// Authentication routes (rate limited, CSRF protected)
router.post('/auth/register', authRateLimiter, csrfProtection, AuthController.register);
router.post('/auth/login', authRateLimiter, csrfProtection, AuthController.login);
router.post('/auth/google', authRateLimiter, csrfProtection, AuthController.loginWithGoogle);
router.post('/auth/otp/request', authRateLimiter, csrfProtection, AuthController.requestOTP);
router.post('/auth/otp/verify', authRateLimiter, csrfProtection, AuthController.verifyOTP);
router.post('/auth/logout', requireAuth, csrfProtection, AuthController.logout);
// 2FA routes
router.post('/auth/2fa/generate', requireAuth, csrfProtection, AuthController.generate2FA);
router.post('/auth/2fa/enable', requireAuth, csrfProtection, AuthController.enable2FA);
router.post('/auth/2fa/disable', requireAuth, csrfProtection, AuthController.disable2FA);
router.post('/auth/2fa/verify', requireAuth, csrfProtection, AuthController.verify2FA);
router.get('/auth/2fa/status', requireAuth, AuthController.get2FAStatus);
router.post('/auth/forgot-password', authRateLimiter, csrfProtection, AuthController.forgotPassword);
router.get('/auth/validate-reset-token', publicRateLimiter, AuthController.validateResetToken);
router.post('/auth/reset-password', authRateLimiter, csrfProtection, AuthController.resetPassword);
router.post('/auth/send-verification', requireAuth, csrfProtection, AuthController.sendVerificationEmail);
router.get('/auth/verify-email', AuthController.verifyEmail);

// Protected user route (example) - lenient rate limiting since called frequently
router.get('/me', publicRateLimiter, requireAuth, async (req, res) => {
  try {
    const { twoFactorService } = await import('../services/TwoFactorService');
    const { getUserRoles, getUserPermissions } = await import('../middleware/RequireRole');
    const userId = req.user?._id?.toString() || req.userId;
    const twoFactorEnabled = userId ? await twoFactorService.isEnabled(userId) : false;
    
    // Get user roles and permissions from database
    const userRoles = userId ? await getUserRoles(userId) : [];
    const directRole = (req.user as any)?.role;
    const allRoles = [...new Set([...userRoles, ...(directRole ? [directRole] : [])])];
    const userPermissions = userId && allRoles.length > 0 ? await getUserPermissions(userId, allRoles) : [];
    
    // Get last login info
    const db = (await import('../db/Mongo')).mongo.getDb();
    const sessionsCollection = db.collection('sessions');
    const lastSession = await sessionsCollection.findOne(
      { userId },
      { sort: { createdAt: -1 } }
    );
    
    res.json({
      ok: true,
      data: {
        user: {
          id: req.user?._id?.toString() || req.userId,
          email: req.user?.email,
          firstName: req.user?.firstName,
          lastName: req.user?.lastName,
          phone: req.user?.phone,
          role: allRoles[0] || directRole || 'user',
          roles: allRoles,
          permissions: userPermissions,
          twoFactorEnabled,
          lastLogin: lastSession ? {
            timestamp: lastSession.createdAt,
            ipAddress: lastSession.ipAddress,
            device: lastSession.userAgent,
          } : undefined,
        },
      },
    });
  } catch (error) {
    console.error('Error in /me endpoint:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Profile update
router.put('/me', requireAuth, csrfProtection, UserController.updateMe);
router.post('/me/email-change', requireAuth, csrfProtection, UserController.requestEmailChange);
router.post('/me/change-password', requireAuth, csrfProtection, UserController.changePassword);

// User sessions management
router.get('/me/sessions', requireAuth, UserController.listSessions);
router.post('/me/sessions/:sessionId/revoke', requireAuth, csrfProtection, UserController.revokeSession);

// User email preferences
router.get('/user/email-preferences', requireAuth, UserController.getEmailPreferences);
router.put('/user/email-preferences', requireAuth, csrfProtection, UserController.updateEmailPreferences);

// User addresses management
router.get('/addresses', requireAuth, UserController.listAddresses);
router.post('/addresses', requireAuth, csrfProtection, UserController.createAddress);
router.put('/addresses/:id', requireAuth, csrfProtection, UserController.updateAddress);
router.delete('/addresses/:id', requireAuth, csrfProtection, UserController.deleteAddress);
router.post('/addresses/:id/set-default', requireAuth, csrfProtection, UserController.setDefaultAddress);

// Catalog routes (public)
router.use(catalogRoutes);

// Cart routes
router.use(cartRoutes);

// Order routes
router.use(orderRoutes);

// Support Tickets (User routes)
router.get('/support/tickets', requireAuth, SupportTicketController.listTickets);
router.get('/support/tickets/:id', requireAuth, SupportTicketController.getTicket);
router.post('/support/tickets', requireAuth, csrfProtection, SupportTicketController.createTicket);
router.post('/support/tickets/:id/reply', requireAuth, csrfProtection, SupportTicketController.replyToTicket);

// Support Tickets aliases (for frontend compatibility)
router.get('/tickets', requireAuth, SupportTicketController.listTickets);
router.get('/tickets/:id', requireAuth, SupportTicketController.getTicket);
router.post('/tickets', requireAuth, csrfProtection, SupportTicketController.createTicket);
router.post('/tickets/:id/reply', requireAuth, csrfProtection, SupportTicketController.replyToTicket);
router.post('/tickets/:id/close', requireAuth, csrfProtection, SupportTicketController.closeTicket);

// AI routes (public + protected)
router.use(aiRoutes);

// Theme settings (public - for frontend to load theme) - lenient rate limiting
router.get('/theme-settings', publicRateLimiter, AdminThemeController.activeTheme);

// Store settings (public - for frontend to load store branding)
import { StoreSettingsController } from '../controllers/StoreSettingsController';
router.get('/store-settings', publicRateLimiter, StoreSettingsController.getStoreSettings);

// Public Settings Endpoints
router.get('/settings/shipping/available', SettingsController.getAvailableShipping);
router.get('/settings/payments', SettingsController.getAvailablePayments);
router.get('/settings/email', SettingsController.getEmailSettings);
router.get('/settings/reviews', SettingsController.getReviewSettings);
router.get('/settings/auth/google', publicRateLimiter, SettingsController.getGoogleOAuthStatus);
router.get('/settings/tax-shipping', SettingsController.getTaxShipping);
router.get('/feature-flags', FeatureFlagsController.getPublicFlags);

// Marketing feed (public)
router.get('/marketing', MarketingController.publicFeed);

// Wishlist routes (authenticated)
router.get('/wishlist', requireAuth, featureFlagGuard('features.wishlist.enabled'), WishlistController.getWishlist);
router.post('/wishlist/add', requireAuth, featureFlagGuard('features.wishlist.enabled'), csrfProtection, WishlistController.addItem);
router.delete('/wishlist/:productId', requireAuth, featureFlagGuard('features.wishlist.enabled'), csrfProtection, WishlistController.removeItem);
router.post('/wishlist/:productId/move-to-cart', requireAuth, featureFlagGuard('features.wishlist.enabled'), csrfProtection, WishlistController.moveToCart);
router.get('/wishlist/check/:productId', requireAuth, featureFlagGuard('features.wishlist.enabled'), WishlistController.checkItem);

// Coupon routes
router.post('/coupons/validate', requireAuth, featureFlagGuard('features.coupons.enabled'), csrfProtection, CouponController.validateCoupon);

// Loyalty routes (authenticated)
router.get('/loyalty/balance', requireAuth, featureFlagGuard('features.loyalty.enabled'), LoyaltyController.getBalance);
router.get('/loyalty/transactions', requireAuth, featureFlagGuard('features.loyalty.enabled'), LoyaltyController.getTransactions);
router.post('/loyalty/redeem', requireAuth, featureFlagGuard('features.loyalty.enabled'), csrfProtection, LoyaltyController.redeemPoints);

// Price alerts (authenticated)
router.post('/price-alerts', requireAuth, featureFlagGuard('features.notifications.webpush.enabled'), csrfProtection, PriceAlertController.createAlert);
router.get('/price-alerts', requireAuth, featureFlagGuard('features.notifications.webpush.enabled'), PriceAlertController.getUserAlerts);
router.delete('/price-alerts/:id', requireAuth, featureFlagGuard('features.notifications.webpush.enabled'), csrfProtection, PriceAlertController.removeAlert);

// Frequently bought together (public)
router.get('/products/:productId/frequently-bought', FrequentlyBoughtController.getRecommendations);
router.get('/products/frequently-bought/cart', FrequentlyBoughtController.getCartRecommendations);

// Recently viewed
router.post('/products/:productId/view', RecentlyViewedController.recordView);
router.get('/recently-viewed', RecentlyViewedController.getRecentlyViewed);
router.delete('/recently-viewed', requireAuth, csrfProtection, RecentlyViewedController.clearRecentlyViewed);

// Product Q&A
router.get('/products/:productId/qa', ProductQAController.getProductQA);
router.post('/products/:productId/qa/ask', requireAuth, csrfProtection, ProductQAController.askQuestion);
router.post('/qa/:questionId/answer', requireAuth, csrfProtection, ProductQAController.answerQuestion);
router.get('/qa/my-questions', requireAuth, ProductQAController.getUserQuestions);

// Web push notifications
router.post('/push/subscribe', featureFlagGuard('features.notifications.webpush.enabled'), WebPushController.subscribe);
router.post('/push/unsubscribe', featureFlagGuard('features.notifications.webpush.enabled'), WebPushController.unsubscribe);
router.get('/push/subscriptions', requireAuth, featureFlagGuard('features.notifications.webpush.enabled'), WebPushController.getUserSubscriptions);

// Mobile API routes (optimized for mobile apps)
router.use('/mobile', mobileRoutes);

// Admin routes
router.use(adminRoutes);

// Webhook routes (no CSRF, no auth - webhooks come from external services)
router.post('/webhook/razorpay', WebhookController.razorpay);
router.post('/webhook/delhivery', WebhookController.delhivery);

// Public tracking endpoint
router.get('/shipments/:awb/track', async (req, res) => {
  try {
    const shipping = await platformSettingsService.getSection('shipping');
    if (!shipping.providers.delhivery?.enabled) {
      return res.status(403).json({
        ok: false,
        error: 'Delhivery tracking is currently unavailable',
      });
    }
    const awb = req.params.awb;
    const shipment = await delhiveryService.track(awb);

    if (!shipment) {
      return res.status(404).json({
        ok: false,
        error: 'Shipment not found',
      });
    }

    res.json({
      ok: true,
      data: shipment,
    });
  } catch (error) {
    console.error('Error tracking shipment:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to track shipment',
    });
  }
});

// Shipping rate calculation (public, no auth required)
router.get('/shipping/rates', async (req, res) => {
  try {
    const toPincode = req.query.to_pincode as string;
    const weight = parseFloat(req.query.weight as string) || 1; // Default 1kg
    const fromPincode = Config.get('SHIPPING_FROM_PINCODE', '110001'); // Default from pincode (can be configured)

    if (!toPincode || toPincode.length !== 6) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid pincode. Please provide a valid 6-digit pincode.',
      });
    }

    // Get tax and shipping settings
    const { platformSettingsService } = await import('../services/PlatformSettingsService');
    const settings = await platformSettingsService.getSettings();
    const taxShipping = settings.taxShipping || {
      taxRate: 18,
      defaultShippingCost: 0,
      shippingCalculationMethod: 'flat',
    };

    let formattedRates;

    // Check shipping calculation method
    if (taxShipping.shippingCalculationMethod === 'dynamic') {
      // Try to get rates from Delhivery
      const { settingsService } = await import('../services/SettingsService');
      const shipping = await settingsService.getSetting('shipping');
      
      if (shipping?.providers?.delhivery?.enabled) {
        try {
          const rates = await delhiveryService.getRates(fromPincode, toPincode, weight);
          
          // Format Delhivery response
          formattedRates = rates.map(rate => ({
            service: rate.courier_company_id?.toString() || 'standard',
            name: rate.courier_name || 'Standard Shipping',
            charge: rate.charge || rate.charge_before_tax || 0,
            estimatedDays: parseInt(rate.etd?.replace(/\D/g, '') || '5', 10) || 5,
            recommended: rate.recommended || false,
          }));

          // If no rates returned, fall back to flat rate
          if (formattedRates.length === 0) {
            formattedRates = getFlatShippingRate(taxShipping.defaultShippingCost);
          }
        } catch (delhiveryError) {
          console.error('Error getting Delhivery rates, using flat rate:', delhiveryError);
          formattedRates = getFlatShippingRate(taxShipping.defaultShippingCost);
        }
      } else {
        // Delhivery not enabled, use flat rate
        formattedRates = getFlatShippingRate(taxShipping.defaultShippingCost);
      }
    } else {
      // Use flat shipping rate from settings
      formattedRates = getFlatShippingRate(taxShipping.defaultShippingCost);
    }

    res.json({
      ok: true,
      data: formattedRates,
    });
  } catch (error) {
    console.error('Error calculating shipping rates:', error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to calculate shipping rates',
    });
  }
});

// Get flat shipping rate from settings
function getFlatShippingRate(shippingCost: number) {
  return [
    {
      service: 'standard',
      name: 'Standard Shipping',
      charge: shippingCost,
      estimatedDays: 5,
      recommended: true,
    },
  ];
}

export default router;


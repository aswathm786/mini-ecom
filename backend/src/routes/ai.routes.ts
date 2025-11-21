import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { csrfProtection } from '../middleware/CSRF';
import { requireAuth } from '../middleware/Auth';
import { requireAdmin } from '../middleware/RequireRole';
import { aiAdminRateLimiter, aiChatRateLimiter } from '../utils/aiRateLimit';
import { publicRateLimiter } from '../middleware/Security';
import { featureFlagGuard } from '../middleware/FeatureFlagGuard';

const router = Router();

// Public config - lenient rate limiting since called frequently
router.get('/ai/settings', publicRateLimiter, AIController.getPublicSettings);

// User endpoints
router.post(
  '/ai/product-enhancements',
  csrfProtection,
  featureFlagGuard('features.ai.admin.productDescription.enabled', 503, 'Product enhancements disabled'),
  aiChatRateLimiter,
  AIController.productEnhancements,
);

// Order assistance (requires authentication)
router.post('/ai/order-assist', requireAuth, csrfProtection, aiChatRateLimiter, AIController.orderAssist);

// Admin AI controls & tooling
router.get('/ai/admin/settings', requireAuth, requireAdmin, aiAdminRateLimiter, AIController.getAdminSettings);
router.put('/ai/admin/settings', requireAuth, requireAdmin, csrfProtection, aiAdminRateLimiter, AIController.updateAdminSettings);
router.post(
  '/ai/admin/product-content',
  requireAuth,
  requireAdmin,
  csrfProtection,
  aiAdminRateLimiter,
  AIController.adminProductContent,
);
router.post(
  '/ai/admin/product-faq',
  requireAuth,
  requireAdmin,
  csrfProtection,
  aiAdminRateLimiter,
  AIController.adminProductFAQ,
);
router.post(
  '/ai/admin/email',
  requireAuth,
  requireAdmin,
  featureFlagGuard('features.ai.admin.emailGenerator.enabled'),
  csrfProtection,
  aiAdminRateLimiter,
  AIController.adminEmail,
);
router.post(
  '/ai/admin/support-reply',
  requireAuth,
  requireAdmin,
  featureFlagGuard('features.ai.admin.supportReply.enabled'),
  csrfProtection,
  aiAdminRateLimiter,
  AIController.adminSupportReply,
);
router.post(
  '/ai/admin/analytics',
  requireAuth,
  requireAdmin,
  csrfProtection,
  aiAdminRateLimiter,
  AIController.adminAnalytics,
);

export default router;



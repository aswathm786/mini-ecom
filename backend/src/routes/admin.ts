/**
 * Admin Routes
 * 
 * Admin-only routes for product management, order management, refunds, invoices, and shipping.
 */

import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { AdminProductController } from '../controllers/AdminProductController';
import { AdminAuditController } from '../controllers/AdminAuditController';
import { AdminWebhookController } from '../controllers/AdminWebhookController';
import { AdminRolesController } from '../controllers/AdminRolesController';
import { AdminRefundController } from '../controllers/AdminRefundController';
import { AdminInvoiceController } from '../controllers/AdminInvoiceController';
import { SupportTicketController } from '../controllers/SupportTicketController';
import { ThemeSettingsController } from '../controllers/ThemeSettingsController';
import { StoreSettingsController } from '../controllers/StoreSettingsController';
import { AdminEmailController } from '../controllers/AdminEmailController';
import { AdminThemeController } from '../controllers/AdminThemeController';
import { requireAuth } from '../middleware/Auth';
import { requireAdmin, requirePermission, requireRole } from '../middleware/RequireRole';
import { csrfProtection } from '../middleware/CSRF';
import { uploadMultiple } from '../middleware/Upload';
import { delhiveryService } from '../services/DelhiveryService';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { Config } from '../config/Config';
import { requireAdminIpWhitelist } from '../middleware/AdminIpWhitelist';
import { AdminSecurityController } from '../controllers/AdminSecurityController';
import { MarketingController } from '../controllers/MarketingController';
import { CouponController } from '../controllers/CouponController';
import { LoyaltyController } from '../controllers/LoyaltyController';
import { ProductQAController } from '../controllers/ProductQAController';
import { WebPushController } from '../controllers/WebPushController';
import { BulkImportController } from '../controllers/BulkImportController';
import { reviewService } from '../services/ReviewService';
import { SettingsController } from '../controllers/SettingsController';
import { FeatureFlagsController } from '../controllers/admin/FeatureFlagsController';
import { AdminSettingsController } from '../controllers/AdminSettingsController';
import { platformSettingsService } from '../services/PlatformSettingsService';
import { featureFlagGuard } from '../middleware/FeatureFlagGuard';
import adminSettingsRoutes from './admin/settings';
import { CountryController } from '../controllers/CountryController';
import { SecretController } from '../controllers/SecretController';
import { SchemaController } from '../controllers/SchemaController';

const router = Router();

// All admin routes require authentication, admin role
router.use(requireAuth);
router.use(requireAdminIpWhitelist);
router.use(requireAdmin);
// CSRF protection only for POST/PUT/DELETE requests
router.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// Products CRUD
router.get('/admin/products', requirePermission('catalog.view', 'catalog.manage'), AdminProductController.list);
router.get('/admin/products/:id', requirePermission('catalog.view', 'catalog.manage'), AdminController.getProduct);
router.post('/admin/products', requirePermission('catalog.manage'), uploadMultiple.array('images', 5), AdminController.createProduct);
router.put('/admin/products/:id', requirePermission('catalog.manage'), uploadMultiple.array('images', 5), AdminController.updateProduct);
router.delete('/admin/products/:id', requirePermission('catalog.manage'), AdminController.deleteProduct);

// Categories CRUD
router.get('/admin/categories', requirePermission('catalog.manage'), AdminController.listCategories);
router.post('/admin/categories', requirePermission('catalog.manage'), AdminController.createCategory);
router.put('/admin/categories/:id', requirePermission('catalog.manage'), AdminController.updateCategory);
router.delete('/admin/categories/:id', requirePermission('catalog.manage'), AdminController.deleteCategory);

// Dashboard
router.get('/admin/dashboard/stats', AdminController.getDashboardStats);

// Orders
router.get('/admin/orders', requirePermission('orders.view'), AdminController.listOrders);
router.get('/admin/orders/:id', requirePermission('orders.view'), AdminController.getOrder);
router.put('/admin/orders/:id', requirePermission('orders.manage'), AdminController.updateOrderStatus);

// Refunds
router.get('/admin/refunds', requirePermission('refunds.manage'), AdminRefundController.listRefunds);
router.post('/admin/orders/:id/refund', requirePermission('refunds.manage'), AdminRefundController.createRefund);

// Shipping (Delhivery) - create shipment for an order (used by admin orders page)
router.post('/admin/orders/:id/create-shipment', requirePermission('orders.manage'), async (req, res) => {
  try {
    const shipping = await platformSettingsService.getSection('shipping');
    const delhiveryEnabled = shipping.providers.delhivery?.enabled ?? false;
    
    if (!delhiveryEnabled) {
      return res.status(403).json({
        ok: false,
        error: 'Delhivery provider is currently disabled',
      });
    }
    
    const orderId = req.params.id;
    const db = mongo.getDb();
    const ordersCollection = db.collection('orders');
    
    const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }
    
    const pickupDetails = {
      client_name: Config.get('STORE_NAME', 'Handmade Harmony'),
      name: order.shippingAddress.name,
      phone: order.shippingAddress.phone || '',
      add: order.shippingAddress.street,
      pin: order.shippingAddress.pincode,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      country: order.shippingAddress.country,
      order: orderId,
      payment_mode: order.payment?.gateway === 'cod' ? 'COD' : 'Prepaid',
      total_amount: order.amount,
      shipment_width: 10,
      shipment_height: 10,
      shipment_length: 10,
      weight: 1, // Default weight, should be calculated from order items
    };
    
    const shipment = await delhiveryService.createShipment(orderId, pickupDetails);
    
    res.status(201).json({
      ok: true,
      data: shipment,
    });
  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to create shipment',
    });
  }
});

// Shipments listing for admin (used by Shipments admin page)
router.get('/admin/shipments', requirePermission('orders.manage'), async (req, res) => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const limit = Math.max(parseInt((req.query.limit as string) || '20', 10), 1);
    const skip = (page - 1) * limit;

    const db = mongo.getDb();
    const shipmentsCollection = db.collection('shipments');

    const query: any = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.orderId) {
      query.orderId = req.query.orderId;
    }

    const total = await shipmentsCollection.countDocuments(query);
    const items = await shipmentsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      ok: true,
      data: {
        items,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing shipments:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch shipments',
    });
  }
});

// Download shipment label by AWB (used by admin shipments page)
router.get('/admin/shipments/:awb/label', async (req, res) => {
  try {
    const shipping = await platformSettingsService.getSection('shipping');
    if (!shipping.providers.delhivery?.enabled) {
      return res.status(403).json({ ok: false, error: 'Delhivery provider is currently disabled' });
    }
    const awb = req.params.awb;
    const result = await delhiveryService.generateAWB(awb);
    
    if (!result) {
      return res.status(404).json({ ok: false, error: 'Label not found' });
    }
    
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(result.labelPath)) {
      return res.status(404).json({ ok: false, error: 'Label file not found' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="AWB_${awb}.pdf"`);
    res.sendFile(path.resolve(result.labelPath));
  } catch (error) {
    console.error('Error getting label:', error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to get label',
    });
  }
});

// User management
router.get('/admin/users', requirePermission('users.view'), AdminController.listUsers);
router.get('/admin/users/:id', requirePermission('users.view'), AdminController.getUser);
router.put('/admin/users/:id/block', requirePermission('users.manage'), AdminController.blockUser);
router.post('/admin/users/:id/reset-password', requirePermission('users.manage'), AdminController.resetUserPassword);
router.put('/admin/users/:id/roles', requireRole('admin', 'root', 'administrator'), AdminController.editUserRoles);
router.get('/admin/users/:id/sessions', requirePermission('users.view'), AdminController.getUserSessions);
router.post('/admin/users/:id/revoke-session', requirePermission('users.manage'), AdminController.revokeSession);

// Support Tickets (Admin)
router.get('/admin/support/tickets', SupportTicketController.listTickets);
router.get('/admin/support/tickets/:id', SupportTicketController.getTicket);
router.post('/admin/support/tickets/:id/reply', SupportTicketController.replyToTicket);
router.post('/admin/support/tickets/:id/status', SupportTicketController.updateStatus);

// Theme Settings
router.get('/admin/theme-settings', ThemeSettingsController.getThemeSettings);
router.put('/admin/theme-settings', ThemeSettingsController.updateThemeSettings);
router.post('/admin/theme-settings/upload-logo', uploadMultiple.single('logo'), ThemeSettingsController.uploadLogo);
router.post('/admin/theme-settings/upload-image', uploadMultiple.single('image'), ThemeSettingsController.uploadImage);

// Store Settings Routes
router.get('/admin/store-settings', StoreSettingsController.getAdminStoreSettings);
router.put('/admin/store-settings', csrfProtection, StoreSettingsController.updateStoreSettings);
router.post('/admin/store-settings/upload-logo', csrfProtection, uploadMultiple.single('logo'), StoreSettingsController.uploadLogo);
router.post('/admin/store-settings/upload-favicon', csrfProtection, uploadMultiple.single('favicon'), StoreSettingsController.uploadFavicon);

// Settings toggles
router.get('/admin/settings/platform', requirePermission('settings.manage'), AdminSettingsController.getPlatformSettings);
router.patch('/admin/settings/path', requirePermission('settings.manage'), AdminSettingsController.updateByPath);
router.get('/admin/settings/shipping', requirePermission('settings.manage'), AdminSettingsController.getShipping);
router.patch('/admin/settings/shipping', requirePermission('settings.manage'), AdminSettingsController.updateShipping);
router.get('/admin/settings/payments', requirePermission('settings.manage'), AdminSettingsController.getPayments);
router.patch('/admin/settings/payments', requirePermission('settings.manage'), AdminSettingsController.updatePaymentMethod);
router.get('/admin/settings/tax-shipping', requirePermission('settings.manage'), AdminSettingsController.getTaxShipping);
router.patch('/admin/settings/tax-shipping', requirePermission('settings.manage'), AdminSettingsController.updateTaxShipping);
router.get('/admin/settings/email', requirePermission('settings.manage'), AdminSettingsController.getEmailSettings);
router.patch('/admin/settings/email', requirePermission('settings.manage'), AdminSettingsController.updateEmailSettings);
router.get('/admin/settings/theme', requirePermission('settings.manage'), AdminSettingsController.getThemeSettings);
router.patch('/admin/settings/theme/toggle', requirePermission('settings.manage'), AdminSettingsController.toggleThemeSystem);
router.post('/admin/settings/theme/schedule', requirePermission('settings.manage'), AdminSettingsController.scheduleThemeActivation);
router.post('/admin/settings/test-razorpay', requirePermission('settings.manage'), AdminSettingsController.testRazorpay);

// Theme Manager
router.get('/admin/themes', requirePermission('settings.manage'), AdminThemeController.list);
router.post('/admin/themes', requirePermission('settings.manage'), AdminThemeController.create);
router.patch('/admin/themes/:id', requirePermission('settings.manage'), AdminThemeController.update);
router.delete('/admin/themes/:id', requirePermission('settings.manage'), AdminThemeController.delete);
router.post('/admin/themes/:id/publish', requirePermission('settings.manage'), AdminThemeController.activate);
router.post('/admin/themes/:id/schedule', requirePermission('settings.manage'), AdminThemeController.schedule);
router.get('/admin/themes/:id/export', requirePermission('settings.manage'), AdminThemeController.export);
router.post('/admin/themes/import', requirePermission('settings.manage'), AdminThemeController.import);

// Security settings
router.get('/admin/security/ip-whitelist', requireRole('admin', 'root', 'administrator'), AdminSecurityController.getAdminIpWhitelist);
router.put('/admin/security/ip-whitelist', requireRole('admin', 'root', 'administrator'), AdminSecurityController.updateAdminIpWhitelist);

// Marketing studio
router.get('/admin/marketing', requirePermission('marketing.manage'), MarketingController.getAdminConfig);
router.post('/admin/marketing', requirePermission('marketing.manage'), MarketingController.createAdminConfig);
router.put('/admin/marketing', requirePermission('marketing.manage'), MarketingController.updateAdminConfig);
router.delete('/admin/marketing', requirePermission('marketing.manage'), MarketingController.deleteAdminConfig);

// Roles & permissions
router.get('/admin/roles', requireRole('admin', 'root', 'administrator'), AdminRolesController.listRoles);
router.post('/admin/roles', requireRole('admin', 'root', 'administrator'), AdminRolesController.createRole);
router.put('/admin/roles/:id', requireRole('admin', 'root', 'administrator'), AdminRolesController.updateRole);
router.delete('/admin/roles/:id', requireRole('admin', 'root', 'administrator'), AdminRolesController.deleteRole);
router.get('/admin/permissions', requireRole('admin', 'root', 'administrator'), AdminRolesController.listPermissions);

// Webhooks monitoring
router.get('/admin/webhooks', requirePermission('webhooks.manage'), AdminWebhookController.list);
router.get('/admin/webhooks/:id', requirePermission('webhooks.manage'), AdminWebhookController.get);
router.post('/admin/webhooks/:id/retry', requirePermission('webhooks.manage'), AdminWebhookController.retry);

// Audit logs
router.get('/admin/audit', requireRole('admin', 'root', 'administrator'), AdminAuditController.list);
router.post('/admin/audit/log-access-attempt', AdminAuditController.logAccessAttempt);

// Coupon management (Admin)
router.get('/admin/coupons', CouponController.listCoupons);
router.post('/admin/coupons', featureFlagGuard('features.coupons.enabled'), CouponController.createCoupon);
router.put('/admin/coupons/:id', featureFlagGuard('features.coupons.enabled'), CouponController.updateCoupon);
router.delete('/admin/coupons/:id', featureFlagGuard('features.coupons.enabled'), CouponController.deleteCoupon);

// Loyalty management (Admin)
router.get('/admin/loyalty/user/:userId', featureFlagGuard('features.loyalty.enabled'), LoyaltyController.getUserAccount);
router.post('/admin/loyalty/adjust', featureFlagGuard('features.loyalty.enabled'), LoyaltyController.adjustPoints);

// Product Q&A moderation (Admin)
router.get('/admin/qa/pending/questions', ProductQAController.getPendingQuestions);
router.get('/admin/qa/pending/answers', ProductQAController.getPendingAnswers);
router.post('/admin/qa/questions/:questionId/moderate', ProductQAController.moderateQuestion);
router.post('/admin/qa/answers/:answerId/moderate', ProductQAController.moderateAnswer);

// Web push broadcast (Admin)
router.post('/admin/push/broadcast', featureFlagGuard('features.notifications.webpush.enabled'), WebPushController.broadcast);

// Bulk import (Admin)
router.post('/admin/products/import', featureFlagGuard('tools.bulkImport.enabled'), BulkImportController.importProducts);
router.get('/admin/products/import/template', BulkImportController.getTemplate);

// Admin Settings Routes (advanced settings under /admin/settings/advanced)
router.use('/admin/settings/advanced', adminSettingsRoutes);

// Email Templates
router.get('/admin/email-templates', AdminEmailController.listTemplates);
router.get('/admin/email-templates/:id', AdminEmailController.getTemplate);
router.post('/admin/email-templates', AdminEmailController.createTemplate);
router.put('/admin/email-templates/:id', AdminEmailController.updateTemplate);
router.delete('/admin/email-templates/:id', AdminEmailController.deleteTemplate);
router.post('/admin/email-templates/:id/preview', AdminEmailController.previewTemplate);
router.post('/admin/email-broadcast', AdminEmailController.broadcast);

// Review Management (Admin)
router.put('/admin/reviews/:id/status', async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid status. Must be pending, approved, or rejected',
      });
    }
    
    const success = await reviewService.updateReviewStatus(reviewId, status);
    
    if (!success) {
      return res.status(404).json({
        ok: false,
        error: 'Review not found',
      });
    }
    
    res.json({
      ok: true,
      message: 'Review status updated',
    });
  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to update review status',
    });
  }
});

router.post('/admin/reviews/:id/reply', csrfProtection, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required',
      });
    }
    
    const reviewId = req.params.id;
    const { message } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Reply message is required',
      });
    }
    
    if (message.trim().length > 1000) {
      return res.status(400).json({
        ok: false,
        error: 'Reply message must be less than 1000 characters',
      });
    }
    
    // Check if review exists
    const review = await reviewService.getReviewById(reviewId);
    if (!review) {
      return res.status(404).json({
        ok: false,
        error: 'Review not found',
      });
    }
    
    const success = await reviewService.addAdminReply(reviewId, req.userId, message.trim());
    
    if (!success) {
      return res.status(500).json({
        ok: false,
        error: 'Failed to add admin reply',
      });
    }
    
    // Get updated review
    const updatedReview = await reviewService.getReviewById(reviewId);
    
    res.json({
      ok: true,
      message: 'Admin reply added successfully',
      data: updatedReview,
    });
  } catch (error) {
    console.error('Error adding admin reply:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to add admin reply',
    });
  }
});

// Country management routes
router.get('/admin/countries', CountryController.listCountries);
router.post('/admin/countries', csrfProtection, CountryController.createCountry);
router.put('/admin/countries/:id', csrfProtection, CountryController.updateCountry);
router.delete('/admin/countries/:id', csrfProtection, CountryController.deleteCountry);

// Secrets/Environment variables management routes
router.get('/admin/secrets', SecretController.listSecrets);
router.post('/admin/secrets', csrfProtection, SecretController.createSecret);
router.put('/admin/secrets/:id', csrfProtection, SecretController.updateSecret);
router.delete('/admin/secrets/:id', csrfProtection, SecretController.deleteSecret);

// Database schema management routes
router.get('/admin/schema', requireRole('admin', 'root', 'administrator'), SchemaController.getSchema);
router.get('/admin/schema/:collection', requireRole('admin', 'root', 'administrator'), SchemaController.getCollectionDetails);
router.post('/admin/schema/init', requireRole('admin', 'root', 'administrator'), csrfProtection, SchemaController.initSchema);

export default router;


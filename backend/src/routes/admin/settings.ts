/**
 * Admin Settings Routes
 * 
 * All routes require admin authentication and CSRF protection
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/Auth';
import { requireAdmin } from '../../middleware/RequireRole';
import { requireAdminIpWhitelist } from '../../middleware/AdminIpWhitelist';
import { csrfProtection } from '../../middleware/CSRF';
import { ShippingSettingsController } from '../../controllers/admin/ShippingSettingsController';
import { PaymentSettingsController } from '../../controllers/admin/PaymentSettingsController';
import { EmailSettingsController } from '../../controllers/admin/EmailSettingsController';
import { ReviewSettingsController } from '../../controllers/admin/ReviewSettingsController';
import { SecuritySettingsController } from '../../controllers/admin/SecuritySettingsController';
import { InfrastructureSettingsController } from '../../controllers/admin/InfrastructureSettingsController';
import { CommerceSettingsController } from '../../controllers/admin/CommerceSettingsController';
import { AISettingsController } from '../../controllers/admin/AISettingsController';
import { NotificationSettingsController } from '../../controllers/admin/NotificationSettingsController';
import { ToolsSettingsController } from '../../controllers/admin/ToolsSettingsController';
import { FeatureFlagsController } from '../../controllers/admin/FeatureFlagsController';
import { ThemeSettingsController } from '../../controllers/admin/ThemeSettingsController';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdminIpWhitelist);
router.use(requireAdmin);
router.use(csrfProtection);

// Shipping Settings
router.get('/shipping', ShippingSettingsController.getSettings);
router.patch('/shipping', ShippingSettingsController.updateProvider);

// Payment Settings
router.get('/payments', PaymentSettingsController.getSettings);
router.patch('/payments', PaymentSettingsController.updateMethod);

// Email Settings
router.get('/email', EmailSettingsController.getSettings);
router.patch('/email', EmailSettingsController.updateSettings);

// Theme Settings
router.get('/theme', ThemeSettingsController.getSettings);
router.patch('/theme', ThemeSettingsController.updateSettings);

// Review Settings
router.get('/reviews', ReviewSettingsController.getSettings);
router.patch('/reviews', ReviewSettingsController.updateSettings);

// Security Settings
router.get('/security', SecuritySettingsController.getSettings);
router.patch('/security/2fa', SecuritySettingsController.update2FA);
router.patch('/security/ip-whitelist', SecuritySettingsController.updateIpWhitelist);
router.patch('/security/fraud', SecuritySettingsController.updateFraudDetection);

// Infrastructure Settings
router.get('/maintenance', InfrastructureSettingsController.getMaintenance);
router.patch('/maintenance', InfrastructureSettingsController.updateMaintenance);
router.get('/cdn', InfrastructureSettingsController.getCDN);
router.patch('/cdn', InfrastructureSettingsController.updateCDN);
router.post('/cdn/purge', InfrastructureSettingsController.purgeCDN);
router.get('/backups', InfrastructureSettingsController.getBackups);
router.patch('/backups', InfrastructureSettingsController.updateBackups);
router.post('/backups/trigger', InfrastructureSettingsController.triggerBackup);
router.get('/monitoring', InfrastructureSettingsController.getMonitoring);
router.patch('/monitoring', InfrastructureSettingsController.updateMonitoring);
router.get('/privacy', InfrastructureSettingsController.getPrivacy);
router.patch('/privacy', InfrastructureSettingsController.updatePrivacy);

// Commerce Settings
router.patch('/commerce/wishlist', CommerceSettingsController.updateWishlist);
router.patch('/commerce/coupons', CommerceSettingsController.updateCoupons);
router.patch('/commerce/loyalty', CommerceSettingsController.updateLoyalty);
router.patch('/commerce/guest-checkout', CommerceSettingsController.updateGuestCheckout);
router.patch('/commerce/returns', CommerceSettingsController.updateReturns);

// AI Settings
router.get('/ai', AISettingsController.getAISettings);
router.patch('/ai', AISettingsController.updateAI);
router.get('/ai/search', AISettingsController.getSearchSettings);
router.patch('/ai/search', AISettingsController.updateSearch);

// Notification Settings
router.get('/notifications', NotificationSettingsController.getSettings);
router.patch('/notifications', NotificationSettingsController.updateSettings);

// Tools Settings
router.get('/tools', ToolsSettingsController.getSettings);
router.patch('/tools', ToolsSettingsController.updateSettings);

// Feature Flags (centralized)
router.get('/feature-flags', FeatureFlagsController.getFlags);
router.patch('/feature-flags', FeatureFlagsController.updateFlags);

export default router;


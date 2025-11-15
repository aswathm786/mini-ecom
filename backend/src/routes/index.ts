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
import { authRateLimiter } from '../middleware/Security';
import { Config } from '../config/Config';
import catalogRoutes from './catalog';
import cartRoutes from './cart';
import orderRoutes from './orders';
import adminRoutes from './admin';
import { SupportTicketController } from '../controllers/SupportTicketController';
import { AIController } from '../controllers/AIController';
import { UserController } from '../controllers/UserController';

const router = Router();

// Health check (no auth required)
router.get('/health', HealthController.health);

// CSRF token endpoint (no auth required, no CSRF protection)
router.get('/csrf-token', csrfTokenHandler);

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
router.post('/auth/logout', requireAuth, csrfProtection, AuthController.logout);
router.post('/auth/forgot-password', authRateLimiter, csrfProtection, AuthController.forgotPassword);
router.post('/auth/reset-password', authRateLimiter, csrfProtection, AuthController.resetPassword);
router.post('/auth/send-verification', requireAuth, csrfProtection, AuthController.sendVerificationEmail);
router.get('/auth/verify-email', AuthController.verifyEmail);

// Protected user route (example)
router.get('/me', requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: {
      id: req.user?._id?.toString() || req.userId,
      email: req.user?.email,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName,
    },
  });
});

// User email preferences
router.get('/user/email-preferences', requireAuth, UserController.getEmailPreferences);
router.put('/user/email-preferences', requireAuth, csrfProtection, UserController.updateEmailPreferences);

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

// AI Assistant routes (public, rate limited)
router.post('/ai/chat', csrfProtection, AIController.chat);
router.get('/ai/recommendations', AIController.getRecommendations);

// Theme settings (public - for frontend to load theme)
router.get('/theme-settings', async (req, res) => {
  try {
    const db = mongo.getDb();
    const settingsCollection = db.collection('settings');
    
    const themeSettings = await settingsCollection
      .find({ key: { $regex: /^theme\./ } })
      .toArray();
    
    const settings: Record<string, any> = {};
    themeSettings.forEach(setting => {
      settings[setting.key] = setting.value;
    });
    
    // Set defaults
    const defaults = {
      'theme.primary': '#DC2626',
      'theme.secondary': '#1F2937',
      'theme.accent': '#F59E0B',
      'theme.background': '#FFFFFF',
      'theme.text': '#111827',
      'theme.textLight': '#6B7280',
      'theme.headerStyle': 'default',
      'theme.footerStyle': 'default',
      'theme.layoutWidth': 'container',
      'theme.borderRadius': 'md',
      'theme.shadow': 'md',
      'theme.animation': true,
    };
    
    res.json({
      ok: true,
      data: { ...defaults, ...settings },
    });
  } catch (error) {
    console.error('Error getting theme settings:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch theme settings',
    });
  }
});

// Admin routes
router.use(adminRoutes);

// Webhook routes (no CSRF, no auth - webhooks come from external services)
router.post('/webhook/razorpay', WebhookController.razorpay);
router.post('/webhook/delhivery', WebhookController.delhivery);

// Public tracking endpoint
router.get('/shipments/:awb/track', async (req, res) => {
  try {
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
    
    // Get shipping rates from Delhivery
    const rates = await delhiveryService.getRates(fromPincode, toPincode, weight);
    
    // Format response
    const formattedRates = rates.map(rate => ({
      service: rate.courier_company_id?.toString() || 'standard',
      name: rate.courier_name || 'Standard Shipping',
      charge: rate.charge || rate.charge_before_tax || 0,
      estimatedDays: parseInt(rate.etd?.replace(/\D/g, '') || '5', 10) || 5,
      recommended: rate.recommended || false,
    }));
    
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

export default router;


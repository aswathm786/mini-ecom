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

const router = Router();

// Health check (no auth required)
router.get('/health', HealthController.health);

// CSRF token endpoint (no auth required, no CSRF protection)
router.get('/csrf-token', csrfTokenHandler);

// Serve uploaded files
const uploadsPath = Config.get('UPLOAD_DIR', './uploads');
router.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsPath, filename);
  
  // Security: prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(filePath));
});

// Authentication routes (rate limited, CSRF protected)
router.post('/auth/register', authRateLimiter, csrfProtection, AuthController.register);
router.post('/auth/login', authRateLimiter, csrfProtection, AuthController.login);
router.post('/auth/logout', requireAuth, csrfProtection, AuthController.logout);

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

export default router;


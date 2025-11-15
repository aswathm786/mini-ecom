/**
 * Admin Routes
 * 
 * Admin-only routes for product management, order management, refunds, invoices, and shipping.
 */

import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { AdminRefundController } from '../controllers/AdminRefundController';
import { AdminInvoiceController } from '../controllers/AdminInvoiceController';
import { SupportTicketController } from '../controllers/SupportTicketController';
import { ThemeSettingsController } from '../controllers/ThemeSettingsController';
import { requireAuth } from '../middleware/Auth';
import { requireAdmin } from '../middleware/RequireRole';
import { csrfProtection } from '../middleware/CSRF';
import { uploadMultiple } from '../middleware/Upload';
import { delhiveryService } from '../services/DelhiveryService';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { Config } from '../config/Config';

const router = Router();

// All admin routes require authentication, admin role, and CSRF protection
router.use(requireAuth);
router.use(requireAdmin);
router.use(csrfProtection);

// Products CRUD
router.post('/admin/products', uploadMultiple.array('images', 5), AdminController.createProduct);
router.put('/admin/products/:id', uploadMultiple.array('images', 5), AdminController.updateProduct);
router.delete('/admin/products/:id', AdminController.deleteProduct);

// Orders
router.get('/admin/orders', AdminController.listOrders);

// Refunds
router.post('/admin/orders/:id/refund', AdminRefundController.createRefund);

// Invoices
router.post('/admin/orders/:id/generate-invoice', AdminInvoiceController.generateInvoice);
router.get('/admin/invoices/:id', AdminInvoiceController.getInvoice);
router.get('/admin/invoices/:id/download', AdminInvoiceController.downloadInvoice);

// Shipping (Delhivery)
router.post('/admin/orders/:id/create-shipment', async (req, res) => {
  try {
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

router.get('/admin/shipments/:awb/label', async (req, res) => {
  try {
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

// User sessions (placeholder)
router.get('/admin/users/:id/sessions', AdminController.getUserSessions);
router.post('/admin/users/:id/revoke-session', AdminController.revokeSession);

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

export default router;


/**
 * Admin Invoice Controller
 * 
 * Handles invoice generation and email sending for admins.
 */

import { Request, Response } from 'express';
import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { invoiceService } from '../services/InvoiceService';
import { mailService } from '../services/MailService';
import { AuditLog } from '../types';

export class AdminInvoiceController {
  /**
   * POST /api/admin/orders/:id/generate-invoice
   * Generate invoice for an order and optionally email it
   */
  static async generateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const sendEmail = req.body.sendEmail === true || req.body.sendEmail === 'true';
      
      const db = mongo.getDb();
      const ordersCollection = db.collection('orders');
      
      // Get order
      const orderObjId = new ObjectId(orderId);
      const order = await ordersCollection.findOne({ _id: orderObjId });
      
      if (!order) {
        res.status(404).json({
          ok: false,
          error: 'Order not found',
        });
        return;
      }
      
      // Check if invoice already exists
      const existingInvoice = await invoiceService.getInvoiceByOrderId(orderId);
      if (existingInvoice && !req.body.regenerate) {
        res.json({
          ok: true,
          data: existingInvoice,
          message: 'Invoice already exists',
        });
        return;
      }
      
      // Generate invoice
      const invoice = await invoiceService.generateInvoice(
        orderId,
        'manual',
        req.userId
      );
      
      // Send email if requested
      let emailResult = null;
      if (sendEmail) {
        emailResult = await mailService.sendInvoice(
          invoice,
          order,
          invoice.pdfPath
        );
        
        if (!emailResult.success) {
          console.error('Failed to send invoice email:', emailResult.error);
        }
      }
      
      // Log audit event
      await AdminInvoiceController.logAudit({
        actorId: req.userId!,
        actorType: 'user',
        action: 'invoice.generate',
        objectType: 'invoice',
        objectId: invoice._id!,
        metadata: {
          orderId,
          invoiceNumber: invoice.invoiceNumber,
          emailSent: sendEmail,
          emailSuccess: emailResult?.success || false,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(201).json({
        ok: true,
        data: {
          invoice,
          email: emailResult || undefined,
        },
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to generate invoice',
      });
    }
  }

  /**
   * GET /api/admin/invoices/:id
   * Get invoice details
   */
  static async getInvoice(req: Request, res: Response): Promise<void> {
    try {
      const invoiceId = req.params.id;
      
      const db = mongo.getDb();
      const invoicesCollection = db.collection('invoices');
      
      const invoiceObjId = new ObjectId(invoiceId);
      const invoice = await invoicesCollection.findOne({ _id: invoiceObjId });
      
      if (!invoice) {
        res.status(404).json({
          ok: false,
          error: 'Invoice not found',
        });
        return;
      }
      
      res.json({
        ok: true,
        data: invoice,
      });
    } catch (error) {
      console.error('Error getting invoice:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch invoice',
      });
    }
  }

  /**
   * GET /api/admin/invoices/:id/download
   * Download invoice PDF
   */
  static async downloadInvoice(req: Request, res: Response): Promise<void> {
    try {
      const invoiceId = req.params.id;
      
      const db = mongo.getDb();
      const invoicesCollection = db.collection('invoices');
      
      const invoiceObjId = new ObjectId(invoiceId);
      const invoice = await invoicesCollection.findOne({ _id: invoiceObjId });
      
      if (!invoice) {
        res.status(404).json({
          ok: false,
          error: 'Invoice not found',
        });
        return;
      }
      
      if (!invoice.pdfPath) {
        res.status(404).json({
          ok: false,
          error: 'Invoice PDF not generated yet',
        });
        return;
      }
      
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(invoice.pdfPath)) {
        res.status(404).json({
          ok: false,
          error: 'Invoice PDF file not found',
        });
        return;
      }
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      res.sendFile(path.resolve(invoice.pdfPath));
    } catch (error) {
      console.error('Error downloading invoice:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to download invoice',
      });
    }
  }

  /**
   * Helper: Log audit event
   */
  private static async logAudit(log: Omit<AuditLog, '_id' | 'createdAt'>): Promise<void> {
    try {
      const db = mongo.getDb();
      const auditLogsCollection = db.collection<AuditLog>('audit_logs');
      
      await auditLogsCollection.insertOne({
        ...log,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}


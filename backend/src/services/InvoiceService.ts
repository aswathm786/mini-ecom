/**
 * Invoice Service
 * 
 * Generates invoices (HTML + PDF) for orders.
 * Supports Node PDF generation (puppeteer/pdf-lib) and PHP Dompdf placeholder.
 */

import { mongo } from '../db/Mongo';
import { ObjectId } from 'mongodb';
import { Config } from '../config/Config';
import { saveFile, getFileUrl } from '../utils/fileUtils';
import * as path from 'path';

export interface Invoice {
  _id?: string;
  orderId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  pdfPath?: string;
  pdfUrl?: string;
  source: 'razorpay' | 'manual';
  generatedBy?: string; // userId
  createdAt: Date;
}

class InvoiceService {
  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(): string {
    const prefix = Config.get('INVOICE_PREFIX', 'INV');
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Build invoice HTML template
   */
  private buildInvoiceHTML(order: any, invoiceNumber: string): string {
    const storeName = Config.get('APP_NAME', 'Handmade Harmony');
    const storeAddress = Config.get('STORE_ADDRESS', '');
    const storePhone = Config.get('STORE_PHONE', '');
    const storeEmail = Config.get('STORE_EMAIL', '');
    
    const orderDate = new Date(order.placedAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const itemsHTML = order.items.map((item: any) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>₹${item.priceAt.toFixed(2)}</td>
        <td>₹${(item.qty * item.priceAt).toFixed(2)}</td>
      </tr>
    `).join('');
    
    const taxPercent = Config.int('TAX_PERCENTAGE', 18);
    const subtotal = order.amount;
    const tax = (subtotal * taxPercent) / (100 + taxPercent);
    const total = subtotal;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .store-info {
      float: left;
    }
    .invoice-info {
      float: right;
      text-align: right;
    }
    .clear {
      clear: both;
    }
    .billing-info {
      margin: 20px 0;
    }
    .billing-info table {
      width: 100%;
    }
    .billing-info td {
      padding: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .total-row {
      font-weight: bold;
      background-color: #f9f9f9;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-info">
      <h1>${storeName}</h1>
      ${storeAddress ? `<p>${storeAddress}</p>` : ''}
      ${storePhone ? `<p>Phone: ${storePhone}</p>` : ''}
      ${storeEmail ? `<p>Email: ${storeEmail}</p>` : ''}
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
      <p><strong>Date:</strong> ${orderDate}</p>
      <p><strong>Order #:</strong> ${order._id}</p>
    </div>
    <div class="clear"></div>
  </div>
  
  <div class="billing-info">
    <table>
      <tr>
        <td width="50%">
          <strong>Bill To:</strong><br>
          ${order.billingAddress.name}<br>
          ${order.billingAddress.street}<br>
          ${order.billingAddress.city}, ${order.billingAddress.state}<br>
          ${order.billingAddress.pincode}<br>
          ${order.billingAddress.country}
        </td>
        <td width="50%">
          <strong>Ship To:</strong><br>
          ${order.shippingAddress.name}<br>
          ${order.shippingAddress.street}<br>
          ${order.shippingAddress.city}, ${order.shippingAddress.state}<br>
          ${order.shippingAddress.pincode}<br>
          ${order.shippingAddress.country}
        </td>
      </tr>
    </table>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
        <td>₹${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align: right;"><strong>Tax (${taxPercent}%):</strong></td>
        <td>₹${tax.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
        <td>₹${total.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
  
  <div class="footer">
    <p>Thank you for your business!</p>
    <p>This is a computer-generated invoice.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate PDF from HTML using Node (puppeteer or pdf-lib)
   * For now, returns HTML as placeholder - user can install puppeteer for actual PDF
   */
  private async generatePDFFromHTML(html: string, outputPath: string): Promise<boolean> {
    try {
      // Option 1: Use puppeteer (if installed)
      // const puppeteer = require('puppeteer');
      // const browser = await puppeteer.launch();
      // const page = await browser.newPage();
      // await page.setContent(html);
      // await page.pdf({ path: outputPath, format: 'A4' });
      // await browser.close();
      
      // Option 2: Use pdf-lib (if installed)
      // For now, save HTML as placeholder
      // User can install puppeteer: npm install puppeteer
      
      // Placeholder: Save HTML for now
      // In production, install puppeteer and uncomment above
      saveFile(path.basename(outputPath).replace('.pdf', '.html'), html, 'invoices');
      
      // For now, return false to indicate PDF not generated
      // User should install puppeteer for actual PDF generation
      console.warn('PDF generation requires puppeteer. Install: npm install puppeteer');
      return false;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return false;
    }
  }

  /**
   * Generate invoice for an order
   */
  async generateInvoice(
    orderId: string,
    source: 'razorpay' | 'manual' = 'manual',
    generatedBy?: string
  ): Promise<Invoice> {
    const db = mongo.getDb();
    const ordersCollection = db.collection('orders');
    const invoicesCollection = db.collection<Invoice>('invoices');
    
    // Get order
    const orderObjId = new ObjectId(orderId);
    const order = await ordersCollection.findOne({ _id: orderObjId });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Check if invoice already exists
    const existing = await invoicesCollection.findOne({ orderId });
    if (existing) {
      return existing;
    }
    
    // Generate invoice number
    const invoiceNumber = this.generateInvoiceNumber();
    
    // Build HTML
    const html = this.buildInvoiceHTML(order, invoiceNumber);
    
    // Generate PDF
    const invoiceDir = path.join(Config.get('STORAGE_PATH', './storage'), 'invoices');
    const pdfFilename = `${invoiceNumber}.pdf`;
    const pdfPath = path.join(invoiceDir, pdfFilename);
    
    const pdfGenerated = await this.generatePDFFromHTML(html, pdfPath);
    
    // Create invoice record
    const invoice: Invoice = {
      orderId,
      invoiceNumber,
      amount: order.amount,
      currency: order.currency || 'INR',
      pdfPath: pdfGenerated ? pdfPath : undefined,
      pdfUrl: pdfGenerated ? getFileUrl(pdfFilename, 'invoices') : undefined,
      source,
      generatedBy,
      createdAt: new Date(),
    };
    
    const result = await invoicesCollection.insertOne(invoice);
    invoice._id = result.insertedId.toString();
    
    return invoice;
  }

  /**
   * Get invoice by order ID
   */
  async getInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
    const db = mongo.getDb();
    const invoicesCollection = db.collection<Invoice>('invoices');
    
    const invoice = await invoicesCollection.findOne({ orderId });
    return invoice;
  }

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
    const db = mongo.getDb();
    const invoicesCollection = db.collection<Invoice>('invoices');
    
    const invoice = await invoicesCollection.findOne({ invoiceNumber });
    return invoice;
  }
}

export const invoiceService = new InvoiceService();


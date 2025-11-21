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
import { settingsService } from './SettingsService';
import * as path from 'path';
import * as fs from 'fs';

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
   * Convert local image file to base64 data URI
   */
  private async getLogoAsBase64(logoUrl: string): Promise<string | null> {
    try {
      // If it starts with /api/uploads/, it's a local file
      if (logoUrl.startsWith('/api/uploads/')) {
        const uploadsDir = Config.get('UPLOAD_DIR', './uploads');
        const filename = logoUrl.replace('/api/uploads/', '');
        const filePath = path.join(uploadsDir, filename);
        
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filename).toLowerCase();
          let mimeType = 'image/png';
          
          if (ext === '.jpg' || ext === '.jpeg') {
            mimeType = 'image/jpeg';
          } else if (ext === '.png') {
            mimeType = 'image/png';
          } else if (ext === '.gif') {
            mimeType = 'image/gif';
          } else if (ext === '.webp') {
            mimeType = 'image/webp';
          }
          
          const base64 = fileBuffer.toString('base64');
          return `data:${mimeType};base64,${base64}`;
        }
      }
      return null;
    } catch (error) {
      console.error('Error converting logo to base64:', error);
      return null;
    }
  }

  /**
   * Generate invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    // Get invoice prefix from store settings first, fallback to old setting
    const { storeSettingsService } = await import('./StoreSettingsService');
    const storeSettings = await storeSettingsService.getStoreSettings();
    const prefix = storeSettings.invoicePrefix || await settingsService.getSetting('invoice.prefix') || Config.get('INVOICE_PREFIX', 'INV');
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Build invoice HTML template
   */
  private async buildInvoiceHTML(order: any, invoiceNumber: string): Promise<string> {
    // Get store settings
    const { storeSettingsService } = await import('./StoreSettingsService');
    const storeSettings = await storeSettingsService.getStoreSettings();
    
    // Use store settings name if available, fallback to store.name, then default
    const storeName = storeSettings.name || await storeSettingsService.getStoreName();
    
    // Get store contact info from store settings or fallback to settings
    const storeAddress = storeSettings.address || await settingsService.getSetting('store.address') || Config.get('STORE_ADDRESS', '');
    const storePhone = storeSettings.phone || await settingsService.getSetting('store.phone') || Config.get('STORE_PHONE', '');
    const storeEmail = storeSettings.email || await settingsService.getSetting('store.email') || Config.get('STORE_EMAIL', '');
    
    // Get payment method info
    const paymentGateway = order.payment?.gateway || 'cod';
    const paymentStatus = order.payment?.status || 'pending';
    let paymentMethodDisplay = '';
    
    if (paymentGateway === 'cod') {
      paymentMethodDisplay = '<strong style="color: #d97706;">Cash on Delivery (COD)</strong>';
    } else if (paymentGateway === 'razorpay') {
      paymentMethodDisplay = paymentStatus === 'success' || paymentStatus === 'captured' 
        ? '<strong style="color: #059669;">Prepaid (Online Payment)</strong>'
        : '<strong style="color: #dc2626;">Online Payment (Pending)</strong>';
    } else {
      paymentMethodDisplay = `<strong>${paymentGateway.toUpperCase()}</strong>`;
    }
    
    // Get logo URL from store settings - only include if it exists
    const logoUrl = storeSettings.logo;
    let logoHTML = '';
    if (logoUrl && logoUrl.trim() !== '') {
      // Try to convert local file to base64 for better reliability in PDF
      let logoSrc = logoUrl;
      const base64Logo = await this.getLogoAsBase64(logoUrl);
      
      if (base64Logo) {
        // Use base64 encoded image (best for PDF generation)
        logoSrc = base64Logo;
        console.log(`[Invoice] Using base64 encoded logo for PDF`);
      } else {
        // Convert relative URL to absolute if needed
        if (logoUrl.startsWith('/')) {
          // API routes like /api/uploads should use API_URL (backend), others use APP_URL/FRONTEND_URL
          let baseUrl: string;
          if (logoUrl.startsWith('/api/')) {
            // Use API_URL for backend API routes (where uploads are served)
            baseUrl = Config.get('API_URL', process.env.API_URL) || 
                     Config.get('APP_URL', process.env.APP_URL) || 
                     'http://localhost:3001';
          } else {
            // Use APP_URL or FRONTEND_URL for frontend routes
            baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
          }
          logoSrc = `${baseUrl}${logoUrl}`;
          console.log(`[Invoice] Converted logo URL: ${logoUrl} -> ${logoSrc}`);
        } else if (!logoUrl.startsWith('http://') && !logoUrl.startsWith('https://')) {
          // Assume it's a relative path - use API_URL
          const baseUrl = Config.get('API_URL', process.env.API_URL) || 
                         Config.get('APP_URL', process.env.APP_URL) || 
                         'http://localhost:3001';
          logoSrc = `${baseUrl}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
          console.log(`[Invoice] Converted logo URL: ${logoUrl} -> ${logoSrc}`);
        }
      }
      
      logoHTML = `<img src="${logoSrc}" alt="${storeName}" style="max-height: 60px; margin-bottom: 10px;" />`;
    }
    
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
    .payment-notice {
      margin: 30px 0;
      padding: 15px;
      background-color: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 5px;
      font-size: 16px;
      text-align: center;
    }
    .payment-notice.prepaid {
      background-color: #d1fae5;
      border-color: #10b981;
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
      ${logoHTML}
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
      <p><strong>Payment Method:</strong><br>${paymentMethodDisplay}</p>
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
  
  <div class="payment-notice ${paymentGateway === 'cod' ? '' : 'prepaid'}">
    <strong>PAYMENT METHOD: ${paymentGateway === 'cod' ? '💰 CASH ON DELIVERY (COD)' : '✅ PREPAID (ONLINE PAYMENT)'}</strong>
    ${paymentGateway === 'cod' 
      ? '<br><small>Please collect ₹' + total.toFixed(2) + ' from customer at the time of delivery.</small>' 
      : '<br><small>Payment already received. No cash collection required.</small>'
    }
  </div>
  
  <div class="footer">
    <p>Thank you for your business!</p>
    <p>This is a computer-generated invoice.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate PDF from HTML using puppeteer
   */
  private async generatePDFFromHTML(html: string, outputPath: string): Promise<boolean> {
    try {
      // Try to use puppeteer if available
      let puppeteer;
      try {
        puppeteer = require('puppeteer');
      } catch (err) {
        // Puppeteer not installed or failed to load - save HTML as fallback
        console.error('Failed to load puppeteer:', err);
        console.error('Error message:', err instanceof Error ? err.message : String(err));
        console.warn('Puppeteer not available. Saving HTML instead. Install: npm install puppeteer');
        saveFile(path.basename(outputPath).replace('.pdf', '.html'), html, 'invoices');
        return false;
      }
      
      // Ensure output directory exists
      const fs = require('fs');
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        console.log('Creating invoice directory:', outputDir);
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      console.log('Launching puppeteer browser...');
      // Launch browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for Docker
      });
      
      try {
        console.log('Creating new page...');
        const page = await browser.newPage();
        
        console.log('Setting HTML content...');
        // Set content and wait for any resources to load
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        console.log('Generating PDF to:', outputPath);
        // Generate PDF
        await page.pdf({
          path: outputPath,
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm',
          },
        });
        
        console.log('PDF generated successfully');
        return true;
      } finally {
        await browser.close();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback: save HTML file
      try {
        saveFile(path.basename(outputPath).replace('.pdf', '.html'), html, 'invoices');
      } catch (fallbackError) {
        console.error('Error saving HTML fallback:', fallbackError);
      }
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
    const invoiceNumber = await this.generateInvoiceNumber();
    
    // Build HTML
    const html = await this.buildInvoiceHTML(order, invoiceNumber);
    
    // Generate PDF
    const invoiceDir = path.join(Config.get('STORAGE_PATH', './storage'), 'invoices');
    const pdfFilename = `${invoiceNumber}.pdf`;
    const pdfPath = path.join(invoiceDir, pdfFilename);
    
    console.log('DEBUG: Generating PDF:', {
      invoiceDir,
      pdfFilename,
      pdfPath
    });
    
    const pdfGenerated = await this.generatePDFFromHTML(html, pdfPath);
    
    console.log('DEBUG: PDF generation result:', {
      pdfGenerated,
      willHavePdfPath: pdfGenerated
    });
    
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

  /**
   * Delete an invoice
   */
  async deleteInvoice(invoiceId: string): Promise<boolean> {
    const db = mongo.getDb();
    const invoicesCollection = db.collection<Invoice>('invoices');
    
    try {
      const result = await invoicesCollection.deleteOne({ _id: new ObjectId(invoiceId) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return false;
    }
  }
}

export const invoiceService = new InvoiceService();


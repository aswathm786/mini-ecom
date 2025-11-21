/**
 * Mail Service
 * 
 * Handles email sending via sendmail (default) or SMTP (nodemailer).
 * Supports admin-configurable settings from Config/settings collection.
 */

import * as nodemailer from 'nodemailer';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Config } from '../config/Config';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class MailService {
  /**
   * Check if SMTP is enabled in settings
   */
  private async isSMTPEnabled(): Promise<boolean> {
    try {
      const { platformSettingsService } = await import('./PlatformSettingsService');
      const settings = await platformSettingsService.getSettings();
      // Check nested structure: settings.email.smtp.enabled
      const email = (settings as any).email;
      if (email && email.smtp && email.smtp.enabled === true) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get mail transport (sendmail or SMTP)
   */
  private async getTransport(): Promise<nodemailer.Transporter | null> {
    const mailDriver = Config.get('MAIL_DRIVER', 'sendmail');
    const smtpEnabled = await this.isSMTPEnabled();
    
    if (mailDriver === 'smtp' && smtpEnabled) {
      // Try to get SMTP credentials from Config first (env vars or loaded settings)
      let smtpHost = Config.get('SMTP_HOST', '');
      let smtpPort = Config.int('SMTP_PORT', 0);
      let smtpSecure = Config.bool('SMTP_SECURE', false);
      let smtpUser = Config.get('SMTP_USER', '');
      let smtpPass = Config.get('SMTP_PASS', '');
      
      // If not found in Config, try to get from SettingsService (database)
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        try {
          const { settingsService } = await import('./SettingsService');
          smtpHost = smtpHost || (await settingsService.getSetting('SMTP_HOST')) || '';
          const smtpPortStr = smtpPort || (await settingsService.getSetting('SMTP_PORT')) || '';
          smtpPort = smtpPort || (smtpPortStr ? parseInt(String(smtpPortStr)) : 587);
          smtpUser = smtpUser || (await settingsService.getSetting('SMTP_USER')) || '';
          smtpPass = smtpPass || (await settingsService.getSetting('SMTP_PASS')) || '';
        } catch (error) {
          console.warn('Failed to load SMTP settings from database:', error);
        }
      }
      
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        console.warn('SMTP credentials not fully configured. Please configure SMTP in admin settings or environment variables.');
        console.warn('Missing:', {
          host: !smtpHost,
          port: !smtpPort,
          user: !smtpUser,
          pass: !smtpPass,
        });
        return null;
      }
      
      return nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }
    
    // Sendmail transport (default)
    return null;
  }

  /**
   * Send email using sendmail command
   */
  private async sendViaSendmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const fromEmail = Config.get('SMTP_FROM_EMAIL', 'noreply@yourdomain.com');
      const fromName = Config.get('SMTP_FROM_NAME', 'Your Store Name');
      const from = `${fromName} <${fromEmail}>`;
      
      const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
      
      // Build email content
      const emailContent = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${options.subject}`,
        `Content-Type: text/html; charset=UTF-8`,
        '',
        options.html || options.text || '',
      ].join('\n');
      
      // Use sendmail command
      const { stdout, stderr } = await execAsync(`echo "${emailContent.replace(/"/g, '\\"')}" | sendmail -t`);
      
      if (stderr) {
        console.error('Sendmail error:', stderr);
        return {
          success: false,
          error: stderr,
        };
      }
      
      return {
        success: true,
        messageId: `sendmail_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error sending email via sendmail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email using SMTP
   */
  private async sendViaSMTP(
    transport: nodemailer.Transporter,
    options: EmailOptions
  ): Promise<EmailResult> {
    try {
      let fromEmail = Config.get('SMTP_FROM_EMAIL', '');
      let fromName = Config.get('SMTP_FROM_NAME', '');
      
      // If not in Config, try to get from database
      if (!fromEmail || !fromName) {
        try {
          const { settingsService } = await import('./SettingsService');
          fromEmail = fromEmail || (await settingsService.getSetting('email.smtp.from')) || (await settingsService.getSetting('store.email')) || 'noreply@yourdomain.com';
          
          // Try to get store name from store settings for "from" name
          if (!fromName) {
            const { storeSettingsService } = await import('./StoreSettingsService');
            fromName = await storeSettingsService.getStoreName() || (await settingsService.getSetting('email.smtp.from')) || 'Your Store Name';
          }
        } catch (error) {
          console.warn('Failed to load FROM email settings from database:', error);
          fromEmail = fromEmail || 'noreply@yourdomain.com';
          fromName = fromName || 'Your Store Name';
        }
      }
      
      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          path: att.path,
          content: att.content,
          contentType: att.contentType,
        })),
      };
      
      const info = await transport.sendMail(mailOptions);
      
      console.log(`✓ Email sent successfully to ${options.to} (Message ID: ${info.messageId})`);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Error sending email via SMTP:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Log more details for debugging
      if (error instanceof Error && 'code' in error) {
        console.error('SMTP Error Code:', (error as any).code);
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const transport = await this.getTransport();
    
    if (transport) {
      console.log(`Sending email via SMTP to ${options.to}`);
      return await this.sendViaSMTP(transport, options);
    } else {
      console.warn('SMTP not configured, attempting to use sendmail (may not work on Windows)');
      console.warn('To enable email, configure SMTP settings in Admin Panel > Settings > Email Settings');
      return await this.sendViaSendmail(options);
    }
  }

  /**
   * Send order confirmation email
   * Note: This is a legacy method. New emails should use EmailTriggerService.
   */
  async sendOrderConfirmation(
    order: any,
    invoicePath?: string
  ): Promise<EmailResult> {
    const customerEmail = order.shippingAddress?.email || order.user?.email;
    if (!customerEmail) {
      return {
        success: false,
        error: 'Customer email not found',
      };
    }
    
    // Get site name first, then fallback to store.name, then default
    let storeName = Config.get('APP_NAME', 'Handmade Harmony');
    try {
      const { settingsService } = await import('./SettingsService');
      const siteName = await settingsService.getSetting('site.name');
      const storeNameSetting = await settingsService.getSetting('store.name');
      storeName = siteName || storeNameSetting || storeName;
    } catch (error) {
      console.warn('Failed to load site/store name from settings:', error);
    }
    
    const orderDate = new Date(order.placedAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const html = `
      <h2>Order Confirmation</h2>
      <p>Dear ${order.shippingAddress.name},</p>
      <p>Thank you for your order! Your order #${order._id} has been confirmed.</p>
      <p><strong>Order Date:</strong> ${orderDate}</p>
      <p><strong>Total Amount:</strong> ₹${order.amount.toFixed(2)}</p>
      <p>We will send you tracking information once your order ships.</p>
      <p>Best regards,<br>${storeName}</p>
    `;
    
    const attachments = invoicePath && fs.existsSync(invoicePath)
      ? [{
          filename: path.basename(invoicePath),
          path: invoicePath,
          contentType: 'application/pdf',
        }]
      : undefined;
    
    return await this.sendEmail({
      to: customerEmail,
      subject: `Order Confirmation - #${order._id}`,
      html,
      attachments,
    });
  }

  /**
   * Send invoice email
   */
  async sendInvoice(
    invoice: any,
    order: any,
    invoicePath?: string
  ): Promise<EmailResult> {
    const customerEmail = order.shippingAddress?.email || order.user?.email;
    if (!customerEmail) {
      return {
        success: false,
        error: 'Customer email not found',
      };
    }
    
    // Get store name from store settings, fallback to store.name, then default
    let storeName = Config.get('APP_NAME', 'Handmade Harmony');
    try {
      const { storeSettingsService } = await import('./StoreSettingsService');
      storeName = await storeSettingsService.getStoreName();
    } catch (error) {
      console.warn('Failed to load store name from settings:', error);
    }
    
    const html = `
      <h2>Invoice ${invoice.invoiceNumber}</h2>
      <p>Dear ${order.shippingAddress.name},</p>
      <p>Please find attached invoice for your order #${order._id}.</p>
      <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Amount:</strong> ₹${invoice.amount.toFixed(2)}</p>
      <p>Best regards,<br>${storeName}</p>
    `;
    
    const attachments = invoicePath && fs.existsSync(invoicePath)
      ? [{
          filename: path.basename(invoicePath),
          path: invoicePath,
          contentType: 'application/pdf',
        }]
      : undefined;
    
    return await this.sendEmail({
      to: customerEmail,
      subject: `Invoice ${invoice.invoiceNumber} - Order #${order._id}`,
      html,
      attachments,
    });
  }
}

export const mailService = new MailService();


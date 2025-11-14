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
   * Get mail transport (sendmail or SMTP)
   */
  private async getTransport(): Promise<nodemailer.Transporter | null> {
    const mailDriver = Config.get('MAIL_DRIVER', 'sendmail');
    const smtpEnabled = Config.bool('SMTP_ENABLED', false);
    
    if (mailDriver === 'smtp' && smtpEnabled) {
      // SMTP transport
      const smtpHost = Config.get('SMTP_HOST', 'smtp.gmail.com');
      const smtpPort = Config.int('SMTP_PORT', 587);
      const smtpSecure = Config.bool('SMTP_SECURE', false);
      const smtpUser = Config.get('SMTP_USER', '');
      const smtpPass = Config.get('SMTP_PASS', '');
      
      if (!smtpUser || !smtpPass) {
        console.warn('SMTP credentials not configured, falling back to sendmail');
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
      const fromEmail = Config.get('SMTP_FROM_EMAIL', 'noreply@handmadeharmony.com');
      const fromName = Config.get('SMTP_FROM_NAME', 'Handmade Harmony');
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
      const fromEmail = Config.get('SMTP_FROM_EMAIL', 'noreply@handmadeharmony.com');
      const fromName = Config.get('SMTP_FROM_NAME', 'Handmade Harmony');
      
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
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Error sending email via SMTP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const transport = await this.getTransport();
    
    if (transport) {
      return await this.sendViaSMTP(transport, options);
    } else {
      return await this.sendViaSendmail(options);
    }
  }

  /**
   * Send order confirmation email
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
      <p>Best regards,<br>${Config.get('APP_NAME', 'Handmade Harmony')}</p>
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
    
    const html = `
      <h2>Invoice ${invoice.invoiceNumber}</h2>
      <p>Dear ${order.shippingAddress.name},</p>
      <p>Please find attached invoice for your order #${order._id}.</p>
      <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Amount:</strong> ₹${invoice.amount.toFixed(2)}</p>
      <p>Best regards,<br>${Config.get('APP_NAME', 'Handmade Harmony')}</p>
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


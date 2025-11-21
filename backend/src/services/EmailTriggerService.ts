/**
 * Email Trigger Service
 * 
 * Handles sending emails using templates with Mustache rendering.
 */

import { render } from 'mustache';
import { ObjectId } from 'mongodb';
import { emailTemplateService } from './EmailTemplateService';
import { mailService } from './MailService';
import { mongo } from '../db/Mongo';
import { sanitizeHtmlContent } from '../helpers/sanitize';
import { EmailTemplate, EmailEventType } from '../models/EmailTemplate';
import { settingsService } from './SettingsService';

export interface EmailData {
  [key: string]: any;
}

class EmailTriggerService {
  /**
   * Wrap email body with HTML structure including header with logo
   */
  private wrapEmailHTML(body: string, logoUrl: string | null, storeName: string): string {
    const logoHTML = logoUrl 
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${logoUrl}" alt="${storeName}" style="max-height: 60px; max-width: 200px; height: auto; width: auto; display: block; margin: 0 auto;" border="0" />
         </div>`
      : '';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-header {
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .email-content {
      padding: 20px 0;
    }
    .email-footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="email-header">
    ${logoHTML}
  </div>
  <div class="email-content">
    ${body}
  </div>
  <div class="email-footer">
    <p>© ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get store branding information (name and logo)
   */
  private async getStoreBranding(): Promise<{ storeName: string; storeLogo: string | null }> {
    try {
      // Get store settings first
      const { storeSettingsService } = await import('./StoreSettingsService');
      const storeSettings = await storeSettingsService.getStoreSettings();
      
      // Use store settings name if available, fallback to store.name, then default
      const finalStoreName = storeSettings.name || await storeSettingsService.getStoreName();
      const logoUrl = storeSettings.logo;
      
      // Convert relative logo URL to absolute if needed
      // Only set storeLogo if logoUrl exists and is not empty
      // Email clients need publicly accessible absolute URLs
      let storeLogo: string | null = null;
      if (logoUrl && logoUrl.trim() !== '') {
        // If it's already an absolute URL, use it as is
        if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
          storeLogo = logoUrl;
        } else if (logoUrl.startsWith('/')) {
          // Relative URL - need to determine if it's an API route or frontend route
          // API routes like /api/uploads should use API_URL, others use APP_URL/FRONTEND_URL
          let baseUrl: string;
          if (logoUrl.startsWith('/api/')) {
            // Use API_URL for backend API routes (where uploads are served)
            const { Config } = await import('../config/Config');
            // Prefer APP_URL (public domain) over API_URL (might be internal)
            // APP_URL should be the public-facing URL that serves both frontend and API
            baseUrl = Config.get('APP_URL', process.env.APP_URL) || 
                     Config.get('API_URL', process.env.API_URL) || 
                     process.env.FRONTEND_URL || 
                     'http://localhost:3001';
          } else {
            // Use APP_URL or FRONTEND_URL for frontend routes
            baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
          }
          storeLogo = `${baseUrl}${logoUrl}`;
          
          // Log for debugging (remove in production if needed)
          console.log(`[Email] Converted logo URL: ${logoUrl} -> ${storeLogo}`);
        } else {
          // Assume it's a relative path - use API_URL
          const { Config } = await import('../config/Config');
          const baseUrl = Config.get('APP_URL', process.env.APP_URL) || 
                         Config.get('API_URL', process.env.API_URL) || 
                         'http://localhost:3001';
          storeLogo = `${baseUrl}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
          console.log(`[Email] Converted logo URL: ${logoUrl} -> ${storeLogo}`);
        }
      }
      
      return {
        storeName: finalStoreName,
        storeLogo,
      };
    } catch (error) {
      console.error('Error fetching store branding:', error);
      return {
        storeName: 'Handmade Harmony',
        storeLogo: null,
      };
    }
  }

  /**
   * Send a template email
   * 
   * @param eventType - The email event type (e.g., 'ORDER_PLACED')
   * @param toEmail - Recipient email address
   * @param data - Data object for template rendering
   * @param options - Optional overrides (isImportant, skipPreferences, attachments)
   */
  async sendTemplateEmail(
    eventType: string,
    toEmail: string,
    data: EmailData,
    options: {
      isImportant?: boolean;
      skipPreferences?: boolean;
      attachments?: Array<{
        filename: string;
        path?: string;
        content?: Buffer;
        contentType?: string;
      }>;
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if email system is enabled
      const flags = await settingsService.getFeatureFlags();
      const emailEnabled = flags.email?.enabled !== false;
      
      if (!emailEnabled) {
        console.log(`Email system is disabled, skipping ${eventType} to ${toEmail}`);
        return {
          success: false,
          error: 'Email system is currently disabled',
        };
      }
      
      // Inject store branding into email data
      const branding = await this.getStoreBranding();
      const enrichedData = {
        ...data,
        siteName: branding.storeName,
        storeName: branding.storeName,
        storeLogo: branding.storeLogo,
      };

      // Check email category flags
      const isMarketing = eventType.includes('MARKETING') || eventType.includes('NEWSLETTER') || eventType.includes('PROMOTION');
      const isProductLaunch = eventType.includes('PRODUCT_LAUNCH') || eventType.includes('NEW_PRODUCT');
      const isAnnouncement = eventType.includes('ANNOUNCEMENT');
      
      if (isMarketing && flags.email?.marketing?.enabled === false) {
        console.log(`Marketing emails disabled, skipping ${eventType}`);
        return { success: false, error: 'Marketing emails are disabled' };
      }
      
      if (isProductLaunch && flags.email?.productLaunch?.enabled === false) {
        console.log(`Product launch emails disabled, skipping ${eventType}`);
        return { success: false, error: 'Product launch emails are disabled' };
      }
      
      if (isAnnouncement && flags.email?.announcements?.enabled === false) {
        console.log(`Announcement emails disabled, skipping ${eventType}`);
        return { success: false, error: 'Announcement emails are disabled' };
      }

      // Transactional emails are always allowed (forced on)
      
      // Get template from database
      const template = await emailTemplateService.getTemplateByEventType(eventType);
      
      if (!template) {
        console.warn(`Email template not found for event type: ${eventType}`);
        return {
          success: false,
          error: `Template not found for event type: ${eventType}`,
        };
      }

      // Check user email preferences (unless skipped for important emails)
      if (!options.skipPreferences && !template.isProtected) {
        const user = await this.getUserByEmail(toEmail);
        if (user && user.emailPreferences) {
          // Check if user has disabled this email type
          const isDisabled = user.emailPreferences[eventType] === false;
          if (isDisabled) {
            console.log(`Email ${eventType} skipped for ${toEmail} due to user preferences`);
            return {
              success: true, // Not an error, just skipped
            };
          }
        }
      }

      // Render template with Mustache (using enriched data with store branding)
      const renderedSubject = render(template.subject, enrichedData);
      const renderedBody = render(template.body, enrichedData);

      // Wrap email body with HTML structure including logo header
      const emailWrapper = this.wrapEmailHTML(renderedBody, branding.storeLogo, branding.storeName);

      // Sanitize the rendered HTML
      const sanitizedBody = sanitizeHtmlContent(emailWrapper);

      // Send email via MailService
      const result = await mailService.sendEmail({
        to: toEmail,
        subject: renderedSubject,
        html: sanitizedBody,
        attachments: options.attachments,
      });

      if (!result.success) {
        console.error(`Failed to send email ${eventType} to ${toEmail}:`, result.error);
        return {
          success: false,
          error: result.error || 'Failed to send email',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error(`Error sending template email ${eventType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user by email
   */
  private async getUserByEmail(email: string): Promise<any | null> {
    try {
      const db = mongo.getDb();
      const usersCollection = db.collection('users');
      const user = await usersCollection.findOne({ email });
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Send order confirmation email with invoice attachment
   */
  async sendOrderConfirmationWithInvoice(
    order: any,
    invoicePdfPath?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get customer email
      const db = mongo.getDb();
      const usersCollection = db.collection('users');
      
      let customerEmail: string | undefined;
      let customerName = 'Customer';

      if (order.userId) {
        const user = await usersCollection.findOne({ _id: new ObjectId(order.userId) });
        if (user) {
          customerEmail = user.email;
          customerName = user.firstName || user.email;
        }
      } else if (order.guestEmail) {
        customerEmail = order.guestEmail;
        customerName = order.shippingAddress?.name || 'Guest';
      } else if (order.shippingAddress?.email) {
        customerEmail = order.shippingAddress.email;
        customerName = order.shippingAddress.name || 'Customer';
      }

      if (!customerEmail) {
        console.error('No customer email found for order', order._id);
        return {
          success: false,
          error: 'Customer email not found',
        };
      }

      // Prepare email data with all template variables
      const subtotal = order.items.reduce((sum: number, item: any) => sum + (item.priceAt * item.qty), 0);
      const discount = order.couponDiscount || order.loyaltyDiscount || 0;
      const shippingCost = order.shippingCost || 0;
      
      const emailData = {
        userName: customerName,
        orderId: order._id,
        orderDate: order.placedAt.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        orderAmount: `₹${order.amount.toFixed(2)}`,
        orderStatus: order.status || 'pending',
        paymentMethod: order.payment?.gateway || order.paymentMethod || 'N/A',
        paymentStatus: order.payment?.status || 'pending',
        items: order.items.map((item: any) => ({
          name: item.name,
          qty: item.qty,
          priceAt: item.priceAt.toFixed(2),
          itemTotal: (item.priceAt * item.qty).toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        discount: discount > 0 ? discount.toFixed(2) : null,
        shippingCost: shippingCost.toFixed(2),
        shippingAddress: `${order.shippingAddress.name}\n${order.shippingAddress.street}\n${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}\n${order.shippingAddress.country || 'India'}`,
        siteUrl: process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
      };

      // Prepare attachments if invoice PDF exists
      const attachments = invoicePdfPath && require('fs').existsSync(invoicePdfPath)
        ? [{
            filename: `invoice-${order._id}.pdf`,
            path: invoicePdfPath,
            contentType: 'application/pdf',
          }]
        : undefined;

      // Send email using template
      const result = await this.sendTemplateEmail(
        EmailEventType.ORDER_PLACED,
        customerEmail,
        emailData,
        {
          isImportant: true,
          skipPreferences: true,
          attachments,
        }
      );

      return result;
    } catch (error) {
      console.error('Error sending order confirmation with invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const emailTriggerService = new EmailTriggerService();


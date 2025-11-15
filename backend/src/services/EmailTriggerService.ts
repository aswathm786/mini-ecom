/**
 * Email Trigger Service
 * 
 * Handles sending emails using templates with Mustache rendering.
 */

import { render } from 'mustache';
import { emailTemplateService } from './EmailTemplateService';
import { mailService } from './MailService';
import { mongo } from '../db/Mongo';
import { sanitizeHtmlContent } from '../helpers/sanitize';
import { EmailTemplate } from '../models/EmailTemplate';

export interface EmailData {
  [key: string]: any;
}

class EmailTriggerService {
  /**
   * Send a template email
   * 
   * @param eventType - The email event type (e.g., 'ORDER_PLACED')
   * @param toEmail - Recipient email address
   * @param data - Data object for template rendering
   * @param options - Optional overrides (isImportant, skipPreferences)
   */
  async sendTemplateEmail(
    eventType: string,
    toEmail: string,
    data: EmailData,
    options: {
      isImportant?: boolean;
      skipPreferences?: boolean;
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
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

      // Render template with Mustache
      const renderedSubject = render(template.subject, data);
      const renderedBody = render(template.body, data);

      // Sanitize the rendered HTML
      const sanitizedBody = sanitizeHtmlContent(renderedBody);

      // Send email via MailService
      const result = await mailService.sendEmail({
        to: toEmail,
        subject: renderedSubject,
        html: sanitizedBody,
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
}

export const emailTriggerService = new EmailTriggerService();


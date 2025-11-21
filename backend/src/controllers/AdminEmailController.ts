/**
 * Admin Email Controller
 * 
 * Handles admin operations for email templates and broadcasts.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { emailTemplateService } from '../services/EmailTemplateService';
import { emailTriggerService } from '../services/EmailTriggerService';
import { mailService } from '../services/MailService';
import { mongo } from '../db/Mongo';
import { sanitizeHtmlContent } from '../helpers/sanitize';
import { render } from 'mustache';
import { parsePagination, getPaginationMeta } from '../helpers/pagination';

const createTemplateSchema = z.object({
  name: z.string().min(1),
  eventType: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  isProtected: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  isProtected: z.boolean().optional(),
});

const broadcastSchema = z.object({
  templateId: z.string().min(1),
  audience: z.enum(['all', 'subscribed']),
  isImportant: z.boolean().optional().default(false),
});

export class AdminEmailController {
  /**
   * GET /api/admin/email-templates
   * List all email templates
   */
  static async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await emailTemplateService.listTemplates();
      
      res.json({
        ok: true,
        data: templates,
      });
    } catch (error) {
      console.error('Error listing templates:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch email templates',
      });
    }
  }

  /**
   * GET /api/admin/email-templates/:id
   * Get a single template
   */
  static async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateId = req.params.id;
      const template = await emailTemplateService.getTemplateById(templateId);
      
      if (!template) {
        res.status(404).json({
          ok: false,
          error: 'Template not found',
        });
        return;
      }
      
      res.json({
        ok: true,
        data: template,
      });
    } catch (error) {
      console.error('Error getting template:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch template',
      });
    }
  }

  /**
   * POST /api/admin/email-templates
   * Create a new template
   */
  static async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const validated = createTemplateSchema.parse(req.body);
      
      // Check if eventType already exists
      const existing = await emailTemplateService.getTemplateByEventType(validated.eventType);
      if (existing) {
        res.status(400).json({
          ok: false,
          error: 'Template with this event type already exists',
        });
        return;
      }
      
      // Sanitize HTML content
      const templateData = {
        name: validated.name,
        eventType: validated.eventType,
        subject: validated.subject,
        body: sanitizeHtmlContent(validated.body),
        isProtected: validated.isProtected || false,
      };
      
      const template = await emailTemplateService.createTemplate(templateData);
      
      res.status(201).json({
        ok: true,
        message: 'Template created',
        data: template,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      
      console.error('Error creating template:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to create template',
      });
    }
  }

  /**
   * PUT /api/admin/email-templates/:id
   * Update a template
   */
  static async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateId = req.params.id;
      const validated = updateTemplateSchema.parse(req.body);
      
      // Sanitize HTML content if provided
      const updateData: any = { ...validated };
      if (validated.body) {
        updateData.body = sanitizeHtmlContent(validated.body);
      }
      if (validated.subject) {
        // Subject should be plain text, but allow basic placeholders
        updateData.subject = validated.subject;
      }
      
      const template = await emailTemplateService.updateTemplate(templateId, updateData);
      
      if (!template) {
        res.status(404).json({
          ok: false,
          error: 'Template not found',
        });
        return;
      }
      
      res.json({
        ok: true,
        message: 'Template updated',
        data: template,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      
      console.error('Error updating template:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update template',
      });
    }
  }

  /**
   * POST /api/admin/email-templates/:id/preview
   * Preview a template with sample data
   */
  static async previewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateId = req.params.id;
      const sampleData = req.body.data || {};
      
      const template = await emailTemplateService.getTemplateById(templateId);
      
      if (!template) {
        res.status(404).json({
          ok: false,
          error: 'Template not found',
        });
        return;
      }
      
      // Render template with sample data
      const renderedSubject = render(template.subject, sampleData);
      const renderedBody = render(template.body, sampleData);
      const sanitizedBody = sanitizeHtmlContent(renderedBody);
      
      res.json({
        ok: true,
        data: {
          subject: renderedSubject,
          body: sanitizedBody,
        },
      });
    } catch (error) {
      console.error('Error previewing template:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to preview template',
      });
    }
  }

  /**
   * POST /api/admin/email-broadcast
   * Send broadcast email to users
   */
  static async broadcast(req: Request, res: Response): Promise<void> {
    try {
      const validated = broadcastSchema.parse(req.body);
      
      const template = await emailTemplateService.getTemplateById(validated.templateId);
      if (!template) {
        res.status(404).json({
          ok: false,
          error: 'Template not found',
        });
        return;
      }
      
      // Get users based on audience
      const db = mongo.getDb();
      const usersCollection = db.collection('users');
      
      let query: any = {};
      if (validated.audience === 'subscribed') {
        // Only users who have marketing emails enabled
        query = {
          'emailPreferences.marketing': true,
        };
      }
      
      const users = await usersCollection.find(query).toArray();
      
      // Send emails in batches (async, don't wait)
      const emailPromises = users.map(async (user) => {
        try {
          // Use sample data - in production, you'd want to customize per user
          const sampleData = {
            userName: user.firstName || user.email,
            userEmail: user.email,
          };
          
          await emailTriggerService.sendTemplateEmail(
            template.eventType,
            user.email,
            sampleData,
            {
              isImportant: validated.isImportant,
              skipPreferences: validated.isImportant, // Important emails bypass preferences
            }
          );
        } catch (error) {
          console.error(`Failed to send broadcast email to ${user.email}:`, error);
        }
      });
      
      // Don't wait for all emails to send - return immediately
      Promise.all(emailPromises).catch(err => {
        console.error('Error in broadcast email batch:', err);
      });
      
      res.json({
        ok: true,
        message: `Broadcast initiated for ${users.length} users`,
        count: users.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      
      console.error('Error broadcasting email:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to initiate broadcast',
      });
    }
  }

  /**
   * DELETE /api/admin/email-templates/:id
   * Delete a template
   */
  static async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateId = req.params.id;
      
      const template = await emailTemplateService.getTemplateById(templateId);
      if (!template) {
        res.status(404).json({
          ok: false,
          error: 'Template not found',
        });
        return;
      }
      
      // Prevent deletion of protected templates
      if (template.isProtected) {
        res.status(400).json({
          ok: false,
          error: 'Cannot delete protected template',
        });
        return;
      }
      
      const success = await emailTemplateService.deleteTemplate(templateId);
      
      if (!success) {
        res.status(404).json({
          ok: false,
          error: 'Template not found',
        });
        return;
      }
      
      res.json({
        ok: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to delete template',
      });
    }
  }
}


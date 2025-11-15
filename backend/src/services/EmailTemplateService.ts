/**
 * Email Template Service
 * 
 * Manages email templates stored in MongoDB.
 */

import { mongo } from '../db/Mongo';
import { EmailTemplate } from '../models/EmailTemplate';
import { ObjectId } from 'mongodb';

class EmailTemplateService {
  /**
   * Get template by event type
   */
  async getTemplateByEventType(eventType: string): Promise<EmailTemplate | null> {
    const db = mongo.getDb();
    const templatesCollection = db.collection<EmailTemplate>('email_templates');
    
    const template = await templatesCollection.findOne({ eventType });
    return template;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<EmailTemplate | null> {
    const db = mongo.getDb();
    const templatesCollection = db.collection<EmailTemplate>('email_templates');
    
    try {
      const template = await templatesCollection.findOne({ _id: new ObjectId(templateId) });
      return template;
    } catch (error) {
      return null;
    }
  }

  /**
   * List all templates
   */
  async listTemplates(): Promise<EmailTemplate[]> {
    const db = mongo.getDb();
    const templatesCollection = db.collection<EmailTemplate>('email_templates');
    
    const templates = await templatesCollection
      .find({})
      .sort({ eventType: 1 })
      .toArray();
    
    return templates;
  }

  /**
   * Create a new template
   */
  async createTemplate(data: {
    name: string;
    eventType: string;
    subject: string;
    body: string;
    isProtected?: boolean;
  }): Promise<EmailTemplate> {
    const db = mongo.getDb();
    const templatesCollection = db.collection<EmailTemplate>('email_templates');
    
    const template: EmailTemplate = {
      name: data.name,
      eventType: data.eventType,
      subject: data.subject,
      body: data.body,
      isProtected: data.isProtected || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await templatesCollection.insertOne(template);
    template._id = result.insertedId.toString();
    
    return template;
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    data: {
      name?: string;
      subject?: string;
      body?: string;
      isProtected?: boolean;
    }
  ): Promise<EmailTemplate | null> {
    const db = mongo.getDb();
    const templatesCollection = db.collection<EmailTemplate>('email_templates');
    
    try {
      const update: Partial<EmailTemplate> = {
        updatedAt: new Date(),
      };
      
      if (data.name !== undefined) {
        update.name = data.name;
      }
      if (data.subject !== undefined) {
        update.subject = data.subject;
      }
      if (data.body !== undefined) {
        update.body = data.body;
      }
      if (data.isProtected !== undefined) {
        update.isProtected = data.isProtected;
      }
      
      await templatesCollection.updateOne(
        { _id: new ObjectId(templateId) },
        { $set: update }
      );
      
      const updated = await templatesCollection.findOne({ _id: new ObjectId(templateId) });
      return updated;
    } catch (error) {
      console.error('Error updating template:', error);
      return null;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    const db = mongo.getDb();
    const templatesCollection = db.collection<EmailTemplate>('email_templates');
    
    try {
      const result = await templatesCollection.deleteOne({ _id: new ObjectId(templateId) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }
}

export const emailTemplateService = new EmailTemplateService();


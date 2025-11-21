import { Collection } from 'mongodb';
import { Request } from 'express';
import { mongo } from '../db/Mongo';

export interface AuditEntry {
  _id?: string;
  action: string;
  feature?: string;
  oldValue?: any;
  newValue?: any;
  adminId?: string;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Date;
}

class AdminAuditService {
  private async getCollection(): Promise<Collection<AuditEntry>> {
    const db = mongo.getDb();
    return db.collection<AuditEntry>('admin_audit');
  }

  async log(
    entry: Omit<AuditEntry, 'createdAt' | 'timestamp' | 'ip' | 'userAgent'>,
    req?: Request,
  ): Promise<void> {
    try {
      const collection = await this.getCollection();
      const now = new Date();
      await collection.insertOne({
        ...entry,
        ip: req?.ip || entry.metadata?.ip,
        userAgent: req?.get('user-agent') || entry.metadata?.userAgent,
        timestamp: now,
        createdAt: now,
      });
    } catch (error) {
      console.error('Failed to log admin audit:', error);
      // Don't throw - audit logging should not break the application
    }
  }

  /**
   * Log a feature toggle change
   */
  async logFeatureToggle(
    feature: string,
    oldValue: any,
    newValue: any,
    adminId: string,
    req?: Request,
  ): Promise<void> {
    await this.log({
      action: 'toggle_feature',
      feature,
      oldValue,
      newValue,
      adminId,
      metadata: {
        type: 'feature_toggle',
      },
    }, req);
  }

  /**
   * Log a settings change
   */
  async logSettingsChange(
    setting: string,
    oldValue: any,
    newValue: any,
    adminId: string,
    req?: Request,
  ): Promise<void> {
    await this.log({
      action: 'update_settings',
      feature: setting,
      oldValue,
      newValue,
      adminId,
      metadata: {
        type: 'settings',
      },
    }, req);
  }

  /**
   * Get audit history for a feature
   */
  async getFeatureHistory(
    feature: string,
    limit = 50,
  ): Promise<AuditEntry[]> {
    const collection = await this.getCollection();
    return await collection
      .find({ feature, action: { $in: ['toggle_feature', 'update_settings'] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get recent audit entries
   */
  async getRecentEntries(limit = 100): Promise<AuditEntry[]> {
    const collection = await this.getCollection();
    return await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }
}

export const adminAuditService = new AdminAuditService();



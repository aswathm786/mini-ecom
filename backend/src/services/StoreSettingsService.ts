/**
 * Store Settings Service
 * 
 * Manages store branding settings (name, logo, favicon, contact info).
 * These settings are used across the application for branding purposes.
 */

import { mongo } from '../db/Mongo';
import { StoreSettings, StoreSettingsDocument } from '../models/StoreSettings.model';

const STORE_SETTINGS_KEY = 'store.settings';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedStoreSettings {
  value: StoreSettings;
  expiresAt: number;
}

let cache: CachedStoreSettings | null = null;

class StoreSettingsService {
  /**
   * Get store settings (cached)
   */
  async getStoreSettings(force = false): Promise<StoreSettings> {
    // Return cached value if still valid
    if (!force && cache && cache.expiresAt > Date.now()) {
      return cache.value;
    }

    try {
      const db = mongo.getDb();
      const settingsCollection = db.collection<StoreSettingsDocument>('settings');

      const doc = await settingsCollection.findOne({ key: STORE_SETTINGS_KEY });

      let storeSettings: StoreSettings = {};

      if (doc && doc.value) {
        // If value is a string (JSON), parse it
        if (typeof doc.value === 'string') {
          storeSettings = JSON.parse(doc.value);
        } else {
          storeSettings = doc.value as StoreSettings;
        }
      }

      // Migrate old settings if not present in store settings (non-blocking)
      // Only run migration if values are missing and we haven't checked recently
      // This prevents slow loading on every request
      if (!storeSettings.backendStoreName || !storeSettings.invoicePrefix) {
        // Run migration asynchronously without blocking the response
        // This ensures the API responds quickly even if migration takes time
        (async () => {
          try {
            const { settingsService } = await import('./SettingsService');
            
            const updates: Partial<StoreSettings> = {};
            
            // Migrate store.name to backendStoreName if not set
            if (!storeSettings.backendStoreName) {
              const oldStoreName = await settingsService.getSetting('store.name');
              if (oldStoreName) {
                updates.backendStoreName = oldStoreName;
              }
            }
            
            // Migrate invoice.prefix if not set
            if (!storeSettings.invoicePrefix) {
              const oldInvoicePrefix = await settingsService.getSetting('invoice.prefix');
              if (oldInvoicePrefix) {
                updates.invoicePrefix = oldInvoicePrefix;
              }
            }
            
            // If we migrated any values, save them back (non-blocking)
            if (Object.keys(updates).length > 0) {
              await this.updateStoreSettings(updates, undefined);
              // Update cache with migrated values
              cache = {
                value: { ...storeSettings, ...updates },
                expiresAt: Date.now() + CACHE_TTL,
              };
            }
          } catch (error) {
            console.warn('Error migrating old store settings:', error);
            // Don't throw - migration failure shouldn't block the response
          }
        })().catch(err => {
          console.warn('Migration promise error:', err);
        });
      }

      // Cache the result
      cache = {
        value: storeSettings,
        expiresAt: Date.now() + CACHE_TTL,
      };

      return storeSettings;
    } catch (error) {
      console.error('Error fetching store settings:', error);
      // Return empty object on error
      return {};
    }
  }

  /**
   * Update store settings
   */
  async updateStoreSettings(
    updates: Partial<StoreSettings>,
    adminId?: string
  ): Promise<StoreSettings> {
    try {
      const current = await this.getStoreSettings(true);
      const merged: StoreSettings = {
        ...current,
        ...updates,
      };

      const db = mongo.getDb();
      const settingsCollection = db.collection<StoreSettingsDocument>('settings');

      await settingsCollection.updateOne(
        { key: STORE_SETTINGS_KEY },
        {
          $set: {
            key: STORE_SETTINGS_KEY,
            value: merged,
            type: 'json',
            description: 'Store branding settings (name, logo, favicon, contact info)',
            updatedAt: new Date(),
            updatedBy: adminId,
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Invalidate cache
      cache = null;

      return merged;
    } catch (error) {
      console.error('Error updating store settings:', error);
      throw error;
    }
  }

  /**
   * Get store name (with fallback to backendStoreName, then store.name setting)
   */
  async getStoreName(): Promise<string> {
    const storeSettings = await this.getStoreSettings();
    
    // If name is set in store settings, use it
    if (storeSettings.name) {
      return storeSettings.name;
    }

    // Fallback to backendStoreName
    if (storeSettings.backendStoreName) {
      return storeSettings.backendStoreName;
    }

    // Fallback to old store.name setting (for backward compatibility)
    try {
      const { settingsService } = await import('./SettingsService');
      const storeName = await settingsService.getSetting('store.name');
      return storeName || 'Handmade Harmony';
    } catch (error) {
      return 'Handmade Harmony';
    }
  }

  /**
   * Get store logo
   */
  async getStoreLogo(): Promise<string | null> {
    const storeSettings = await this.getStoreSettings();
    return storeSettings.logo || null;
  }

  /**
   * Get store favicon
   */
  async getStoreFavicon(): Promise<string | null> {
    const storeSettings = await this.getStoreSettings();
    return storeSettings.favicon || null;
  }
}

export const storeSettingsService = new StoreSettingsService();


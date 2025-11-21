/**
 * Settings Service
 *
 * Loads runtime settings from MongoDB `settings` collection.
 * These settings override .env values at runtime.
 *
 * Settings are loaded at server startup and merged into Config.
 * Includes caching for feature flags with TTL and invalidation.
 */

import { Db } from "mongodb";
import { mongo } from "../db/Mongo";
import { setRuntimeSettings } from "../config/Config";
import { Setting } from "../types";
import { FeatureFlags, AppSettings } from "../models/settings.model";

// Cache for feature flags
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const FEATURE_FLAGS_CACHE_TTL = 60 * 1000; // 1 minute
let featureFlagsCache: CacheEntry<FeatureFlags> | null = null;
let settingsCache: CacheEntry<AppSettings> | null = null;

class SettingsService {
  /**
   * Load all settings from database and merge into Config
   * This should be called at server startup after MongoDB connection
   */
  async loadSettings(): Promise<void> {
    try {
      const db = mongo.getDb();
      const settingsCollection = db.collection<Setting>("settings");

      const settings = await settingsCollection.find({}).toArray();

      // Convert settings array to Map<string, any>
      const settingsMap = new Map<string, any>();

      for (const setting of settings) {
        let value: any = setting.value;

        // Convert value based on type
        if (setting.type === "number") {
          value = typeof value === "number" ? value : parseFloat(String(value));
        } else if (setting.type === "boolean") {
          value =
            typeof value === "boolean"
              ? value
              : String(value).toLowerCase() === "true";
        } else if (setting.type === "json") {
          value = typeof value === "string" ? JSON.parse(value) : value;
        }

        settingsMap.set(setting.key, value);
      }

      // Merge into Config
      setRuntimeSettings(settingsMap);

      // Invalidate caches
      this.invalidateCaches();

      if (settings.length > 0) {
        console.log(
          `✓ Loaded ${settings.length} runtime settings from database`
        );
      }
    } catch (error) {
      console.error("Failed to load settings from database:", error);
      // Don't throw - continue with .env values only
    }
  }

  /**
   * Get a setting value by key
   */
  async getSetting(key: string): Promise<any> {
    const db = mongo.getDb();
    const settingsCollection = db.collection<Setting>("settings");
    const setting = await settingsCollection.findOne({ key });
    
    if (!setting) return undefined;
    
    let value: any = setting.value;
    if (setting.type === "json") {
      value = typeof value === "string" ? JSON.parse(value) : value;
    }
    
    return value;
  }

  /**
   * Set a setting value (for admin panel use later)
   */
  async setSetting(
    key: string,
    value: any,
    type: "string" | "number" | "boolean" | "json" = "string",
    description?: string,
    updatedBy?: string
  ): Promise<void> {
    const db = mongo.getDb();
    const settingsCollection = db.collection<Setting>("settings");

    await settingsCollection.updateOne(
      { key },
      {
        $set: {
          key,
          value: type === "json" ? JSON.stringify(value) : value,
          type,
          description,
          updatedAt: new Date(),
          updatedBy,
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Invalidate caches
    this.invalidateCaches();

    // Reload settings to update runtime config
    await this.loadSettings();
  }

  /**
   * Delete a setting by key
   */
  async deleteSetting(key: string): Promise<void> {
    try {
      const db = mongo.getDb();
      const settingsCollection = db.collection<Setting>("settings");

      const result = await settingsCollection.deleteOne({ key });
      
      // Check if setting was actually deleted (optional - deleteOne succeeds even if no document matched)
      if (result.deletedCount === 0) {
        console.warn(`Setting with key "${key}" not found, but deletion operation completed`);
      }

      // Invalidate caches
      this.invalidateCaches();

      // Reload settings to update runtime config
      await this.loadSettings();
    } catch (error) {
      console.error(`Failed to delete setting "${key}":`, error);
      throw new Error(`Failed to delete setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get feature flags (cached)
   */
  async getFeatureFlags(force = false): Promise<FeatureFlags> {
    // Return cached value if valid
    if (!force && featureFlagsCache && featureFlagsCache.expiresAt > Date.now()) {
      return featureFlagsCache.value;
    }

    const features = await this.getSetting('features');
    
    const flags: FeatureFlags = features || {};

    // Update cache
    featureFlagsCache = {
      value: flags,
      expiresAt: Date.now() + FEATURE_FLAGS_CACHE_TTL,
    };

    return flags;
  }

  /**
   * Check if a feature is enabled
   */
  async isFeatureEnabled(featureKey: string): Promise<boolean> {
    const flags = await this.getFeatureFlags();
    
    // Support dot notation: "features.checkout.guestEnabled"
    const keys = featureKey.replace(/^features\./, '').split('.');
    let value: any = flags;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return false; // Feature not found, disabled by default
      }
    }
    
    // Handle both {enabled: true} and direct boolean
    if (typeof value === 'object' && value !== null) {
      return value.enabled === true;
    }
    
    return value === true;
  }

  /**
   * Update feature flags
   */
  async updateFeatureFlags(
    updates: Partial<FeatureFlags>,
    adminId?: string
  ): Promise<FeatureFlags> {
    const current = await this.getFeatureFlags(true);
    
    // Deep merge
    const merged = this.deepMerge(current, updates);
    
    await this.setSetting('features', merged, 'json', 'Feature flags', adminId);
    
    return merged;
  }

  /**
   * Get all app settings (cached)
   */
  async getAppSettings(force = false): Promise<AppSettings> {
    if (!force && settingsCache && settingsCache.expiresAt > Date.now()) {
      return settingsCache.value;
    }

    const settings: AppSettings = {
      features: await this.getFeatureFlags(),
      site: await this.getSetting('site') || {},
      shipping: await this.getSetting('shipping') || {},
      payments: await this.getSetting('payments') || {},
      cdn: await this.getSetting('cdn') || { enabled: false },
      backups: await this.getSetting('backups') || { enabled: false },
      monitoring: await this.getSetting('monitoring') || { enabled: false },
      privacy: await this.getSetting('privacy') || {},
    };

    settingsCache = {
      value: settings,
      expiresAt: Date.now() + FEATURE_FLAGS_CACHE_TTL,
    };

    return settings;
  }

  /**
   * Update app settings
   */
  async updateAppSettings(
    category: keyof AppSettings,
    updates: any,
    adminId?: string
  ): Promise<void> {
    const current = await this.getSetting(category) || {};
    const merged = this.deepMerge(current, updates);
    
    await this.setSetting(category, merged, 'json', `${category} settings`, adminId);
  }

  /**
   * Invalidate all caches
   */
  invalidateCaches(): void {
    featureFlagsCache = null;
    settingsCache = null;
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

export const settingsService = new SettingsService();

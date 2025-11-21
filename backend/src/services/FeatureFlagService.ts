/**
 * Feature Flag Service
 * 
 * Manages feature toggles stored in MongoDB settings collection.
 * Provides caching and invalidation for performance.
 */

import { mongo } from '../db/Mongo';
import { settingsService } from './SettingsService';

interface FeatureFlags {
  [key: string]: {
    enabled: boolean;
    metadata?: Record<string, any>;
  };
}

const FEATURE_FLAGS_CACHE_TTL = 60 * 1000; // 1 minute
let featureFlagsCache: { value: FeatureFlags; expiresAt: number } | null = null;

class FeatureFlagService {
  /**
   * Get all feature flags (cached)
   */
  async getFeatureFlags(force = false): Promise<FeatureFlags> {
    // Return cached value if valid
    if (!force && featureFlagsCache && featureFlagsCache.expiresAt > Date.now()) {
      return featureFlagsCache.value;
    }

    const db = mongo.getDb();
    const settingsCollection = db.collection('settings');

    // Get features setting
    const setting = await settingsCollection.findOne({ key: 'features' });

    let flags: FeatureFlags = {};

    if (setting && setting.value) {
      try {
        flags = typeof setting.value === 'string' 
          ? JSON.parse(setting.value) 
          : setting.value;
      } catch (error) {
        console.error('Error parsing feature flags:', error);
      }
    }

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
    const keys = featureKey.split('.');
    let value: any = flags;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return false; // Feature not found, disabled by default
      }
    }
    
    return value?.enabled === true;
  }

  /**
   * Update feature flags (admin only)
   */
  async updateFeatureFlags(
    updates: Partial<FeatureFlags>,
    adminId?: string
  ): Promise<FeatureFlags> {
    const db = mongo.getDb();
    const settingsCollection = db.collection('settings');

    // Get current flags
    const currentFlags = await this.getFeatureFlags(true);

    // Merge updates
    const mergedFlags = this.deepMerge(currentFlags, updates);

    // Store in database
    await settingsCollection.updateOne(
      { key: 'features' },
      {
        $set: {
          key: 'features',
          value: JSON.stringify(mergedFlags),
          type: 'json',
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      },
      { upsert: true }
    );

    // Invalidate cache
    featureFlagsCache = null;

    // Reload settings
    await settingsService.loadSettings();

    return mergedFlags;
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

  /**
   * Invalidate cache (call after updates)
   */
  invalidateCache(): void {
    featureFlagsCache = null;
  }
}

export const featureFlagService = new FeatureFlagService();


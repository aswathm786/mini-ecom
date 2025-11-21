import { Collection, Document } from 'mongodb';
import { mongo } from '../db/Mongo';
import { DEFAULT_SETTINGS } from '../config/defaultSettings';
import { PlatformSettings } from '../types/settings';

const SETTINGS_KEY = 'platform';
const SETTINGS_CACHE_TTL = 60 * 1000;

interface CachedSettings {
  value: PlatformSettings;
  expiresAt: number;
}

const deepMerge = <T>(target: T, source: Partial<T>): T => {
  if (!source) {
    return target;
  }

  const output: any = Array.isArray(target) ? [...(target as any)] : { ...(target as any) };

  Object.keys(source as Record<string, any>).forEach((key) => {
    const sourceValue = (source as any)[key];
    const targetValue = (output as any)[key];

    // Check if sourceValue is explicitly set (not undefined)
    // Handle false, 0, empty string, null as valid values
    if (sourceValue !== undefined) {
      if (sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        output[key] = deepMerge(
          targetValue ?? (Array.isArray(sourceValue) ? [] : {}),
          sourceValue,
        );
      } else {
        // Set the value directly (including false, 0, empty string, null)
        output[key] = sourceValue;
      }
    }
    // If sourceValue is undefined, keep the existing targetValue (don't overwrite)
  });

  return output;
};

class PlatformSettingsService {
  private cache: CachedSettings | null = null;

  private async getCollection(): Promise<Collection<Document>> {
    const db = mongo.getDb();
    return db.collection('settings');
  }

  private buildSettings(docValue?: any): PlatformSettings {
    let parsed: Partial<PlatformSettings> = {};

    if (typeof docValue === 'string') {
      try {
        parsed = JSON.parse(docValue);
      } catch (error) {
        console.error('Failed to parse platform settings JSON:', error);
      }
    } else if (docValue && typeof docValue === 'object') {
      parsed = docValue as PlatformSettings;
    }

    const clone = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as PlatformSettings;
    return deepMerge(clone, parsed);
  }

  async getSettings(force = false): Promise<PlatformSettings> {
    if (!force && this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.value;
    }

    const collection = await this.getCollection();
    const doc = await collection.findOne({ key: SETTINGS_KEY });

    const settings = this.buildSettings(doc?.value);

    this.cache = {
      value: settings,
      expiresAt: Date.now() + SETTINGS_CACHE_TTL,
    };

    return settings;
  }

  async updateSettings(
    patch: Partial<PlatformSettings>,
    adminId?: string,
  ): Promise<PlatformSettings> {
    const current = await this.getSettings(true);
    const merged = deepMerge(current, patch);

    const collection = await this.getCollection();
    await collection.updateOne(
      { key: SETTINGS_KEY },
      {
        $set: {
          key: SETTINGS_KEY,
          value: JSON.stringify(merged),
          type: 'json',
          updatedAt: new Date(),
          updatedBy: adminId,
        },
      },
      { upsert: true },
    );

    this.cache = {
      value: merged,
      expiresAt: Date.now() + SETTINGS_CACHE_TTL,
    };

    return merged;
  }

  async getSection<T extends keyof PlatformSettings>(
    section: T,
    force = false,
  ): Promise<PlatformSettings[T]> {
    const settings = await this.getSettings(force);
    return settings[section];
  }

  async updateSection<T extends keyof PlatformSettings>(
    section: T,
    patch: Partial<PlatformSettings[T]>,
    adminId?: string,
  ): Promise<PlatformSettings[T]> {
    const updated = await this.updateSettings(
      { [section]: patch } as Partial<PlatformSettings>,
      adminId,
    );
    return updated[section];
  }

  async isFeatureEnabled(path: string): Promise<boolean> {
    const settings = await this.getSettings();
    const segments = path.split('.');
    let current: any = settings;

    for (const segment of segments) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment];
      } else {
        return false;
      }
    }

    if (typeof current === 'boolean') {
      return current;
    }

    if (typeof current === 'object' && 'enabled' in current) {
      return Boolean(current.enabled);
    }

    return false;
  }

  invalidateCache(): void {
    this.cache = null;
  }

  async updatePath(path: string, value: any, adminId?: string): Promise<PlatformSettings> {
    // Handle AI API keys - save them as environment variable settings
    if (path.startsWith('ai.gemini.api_key')) {
      const { settingsService } = await import('./SettingsService');
      // If value is empty string, delete the setting; otherwise set it
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('GEMINI_API_KEY');
      } else {
        await settingsService.setSetting('GEMINI_API_KEY', value, 'string', 'Gemini API Key', adminId);
        // Also update ai.settings if it exists
        const { aiService } = await import('./ai.service');
        const currentAISettings = await aiService.getSettings();
        if (!currentAISettings.enabled && value) {
          // Auto-enable AI if API key is provided
          await aiService.updateSettings({ enabled: true });
        }
      }
      return this.getSettings();
    }
    if (path.startsWith('ai.gemini.model')) {
      const { settingsService } = await import('./SettingsService');
      // If value is empty string, delete the setting; otherwise set it
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('GEMINI_MODEL');
      } else {
        await settingsService.setSetting('GEMINI_MODEL', value, 'string', 'Gemini Model Name', adminId);
      }
      return this.getSettings();
    }
    if (path.startsWith('ai.openai.api_key')) {
      const { settingsService } = await import('./SettingsService');
      // If value is empty string, delete the setting; otherwise set it
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('OPENAI_API_KEY');
      } else {
        await settingsService.setSetting('OPENAI_API_KEY', value, 'string', 'OpenAI API Key', adminId);
      }
      return this.getSettings();
    }
    if (path.startsWith('ai.openai.model')) {
      const { settingsService } = await import('./SettingsService');
      // If value is empty string, delete the setting; otherwise set it
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('OPENAI_MODEL');
      } else {
        await settingsService.setSetting('OPENAI_MODEL', value, 'string', 'OpenAI Model Name', adminId);
      }
      return this.getSettings();
    }
    if (path.startsWith('ai.anthropic.api_key')) {
      const { settingsService } = await import('./SettingsService');
      // If value is empty string, delete the setting; otherwise set it
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('ANTHROPIC_API_KEY');
      } else {
        await settingsService.setSetting('ANTHROPIC_API_KEY', value, 'string', 'Anthropic API Key', adminId);
      }
      return this.getSettings();
    }
    // Handle AI model names
    if (path.startsWith('ai.gemini.model')) {
      const { settingsService } = await import('./SettingsService');
      // If value is empty string, delete the setting; otherwise set it
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('GEMINI_MODEL');
      } else {
        await settingsService.setSetting('GEMINI_MODEL', value, 'string', 'Gemini Model Name', adminId);
      }
      return this.getSettings();
    }
    if (path.startsWith('ai.openai.model')) {
      const { settingsService } = await import('./SettingsService');
      // If value is empty string, delete the setting; otherwise set it
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('OPENAI_MODEL');
      } else {
        await settingsService.setSetting('OPENAI_MODEL', value, 'string', 'OpenAI Model Name', adminId);
      }
      return this.getSettings();
    }
    if (path.startsWith('ai.anthropic.model')) {
      const { settingsService } = await import('./SettingsService');
      // If value is empty string, delete the setting; otherwise set it
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('ANTHROPIC_MODEL');
      } else {
        await settingsService.setSetting('ANTHROPIC_MODEL', value, 'string', 'Anthropic Model Name', adminId);
      }
      return this.getSettings();
    }
    // Handle ai.enabled - save to ai.settings and enable admin tools if enabling
    if (path === 'ai.enabled') {
      const { aiService } = await import('./ai.service');
      const currentSettings = await aiService.getSettings();
      const enabled = Boolean(value);
      await aiService.updateSettings({ 
        enabled,
        // Enable admin tools when AI is enabled (preserve existing tool settings)
        adminTools: enabled ? {
          productDescription: currentSettings.adminTools?.productDescription ?? true,
          productFAQ: currentSettings.adminTools?.productFAQ ?? true,
          supportReplies: currentSettings.adminTools?.supportReplies ?? true,
          emailGenerator: currentSettings.adminTools?.emailGenerator ?? true,
          analytics: currentSettings.adminTools?.analytics ?? true,
        } : currentSettings.adminTools
      });
      return this.getSettings();
    }
    // Handle individual admin tool settings
    if (path.startsWith('ai.adminTools.')) {
      const { aiService } = await import('./ai.service');
      const currentSettings = await aiService.getSettings();
      const toolName = path.replace('ai.adminTools.', '');
      const toolMap: Record<string, 'productDescription' | 'productFAQ' | 'supportReplies' | 'emailGenerator' | 'analytics'> = {
        'productDescription': 'productDescription',
        'productFAQ': 'productFAQ',
        'supportReplies': 'supportReplies',
        'emailGenerator': 'emailGenerator',
        'analytics': 'analytics',
      };
      if (toolMap[toolName]) {
        await aiService.updateSettings({
          adminTools: {
            ...currentSettings.adminTools,
            [toolMap[toolName]]: Boolean(value),
          }
        });
      }
      return this.getSettings();
    }
    
    // Handle Google OAuth secrets
    if (path.startsWith('auth.google.client_secret') || path === 'google.client_secret') {
      const { settingsService } = await import('./SettingsService');
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('GOOGLE_CLIENT_SECRET');
      } else {
        await settingsService.setSetting('GOOGLE_CLIENT_SECRET', value, 'string', 'Google OAuth Client Secret', adminId);
      }
      return this.getSettings();
    }
    if (path.startsWith('auth.google.client_id') || path === 'google.client_id') {
      const { settingsService } = await import('./SettingsService');
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('GOOGLE_CLIENT_ID');
      } else {
        await settingsService.setSetting('GOOGLE_CLIENT_ID', value, 'string', 'Google OAuth Client ID', adminId);
      }
      return this.getSettings();
    }
    
    // Handle SMTP secrets
    if (path.startsWith('email.smtp.pass') || path === 'smtp.pass' || path === 'email.smtp.pass') {
      const { settingsService } = await import('./SettingsService');
      console.log(`[SMTP] Saving SMTP password, path: ${path}, value length: ${value ? value.length : 0}`);
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('SMTP_PASS');
        console.log('[SMTP] Deleted SMTP_PASS setting');
      } else {
        await settingsService.setSetting('SMTP_PASS', value, 'string', 'SMTP Password', adminId);
        console.log('[SMTP] Saved SMTP_PASS setting');
      }
      return this.getSettings();
    }
    if (path.startsWith('email.smtp.user') || path === 'smtp.user' || path === 'email.smtp.user') {
      const { settingsService } = await import('./SettingsService');
      console.log(`[SMTP] Saving SMTP username, path: ${path}, value: ${value ? '***' : 'empty'}`);
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('SMTP_USER');
        console.log('[SMTP] Deleted SMTP_USER setting');
      } else {
        await settingsService.setSetting('SMTP_USER', value, 'string', 'SMTP Username', adminId);
        console.log('[SMTP] Saved SMTP_USER setting');
      }
      return this.getSettings();
    }
    if (path.startsWith('email.smtp.host') || path === 'smtp.host') {
      const { settingsService } = await import('./SettingsService');
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('SMTP_HOST');
      } else {
        await settingsService.setSetting('SMTP_HOST', value, 'string', 'SMTP Host', adminId);
      }
      return this.getSettings();
    }
    if (path.startsWith('email.smtp.port') || path === 'smtp.port') {
      const { settingsService } = await import('./SettingsService');
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('SMTP_PORT');
      } else {
        await settingsService.setSetting('SMTP_PORT', String(value), 'string', 'SMTP Port', adminId);
      }
      return this.getSettings();
    }
    if (path.startsWith('email.smtp.from') || path === 'smtp.from') {
      const { settingsService } = await import('./SettingsService');
      if (value === '' || value === null || value === undefined) {
        await settingsService.deleteSetting('SMTP_FROM_EMAIL');
      } else {
        await settingsService.setSetting('SMTP_FROM_EMAIL', value, 'string', 'SMTP From Email', adminId);
      }
      return this.getSettings();
    }

    // Convert flattened paths to nested structure
    // payments.razorpay.enabled -> payments.methods.razorpay.enabled
    // shipping.delhivery.enabled -> shipping.providers.delhivery.enabled
    let normalizedPath = path;
    if (path.startsWith('payments.') && !path.startsWith('payments.methods.')) {
      // payments.razorpay.enabled -> payments.methods.razorpay.enabled
      const parts = path.split('.');
      if (parts.length >= 2) {
        const methodName = parts[1];
        normalizedPath = `payments.methods.${parts.slice(2).join('.')}`;
        if (parts.length === 2) {
          // payments.razorpay -> payments.methods.razorpay.enabled (if value is boolean)
          normalizedPath = `payments.methods.${methodName}.enabled`;
        } else if (parts[2] === 'key_secret') {
          // payments.razorpay.key_secret -> save to RAZORPAY_KEY_SECRET in settings collection
          const { settingsService } = await import('./SettingsService');
          if (value === '' || value === null || value === undefined) {
            await settingsService.deleteSetting('RAZORPAY_KEY_SECRET');
          } else {
            await settingsService.setSetting('RAZORPAY_KEY_SECRET', value, 'string', 'Razorpay Key Secret', adminId);
          }
          return this.getSettings();
        } else if (parts[2] === 'key_id') {
          // payments.razorpay.key_id -> save to RAZORPAY_KEY_ID in settings collection
          const { settingsService } = await import('./SettingsService');
          if (value === '' || value === null || value === undefined) {
            await settingsService.deleteSetting('RAZORPAY_KEY_ID');
          } else {
            await settingsService.setSetting('RAZORPAY_KEY_ID', value, 'string', 'Razorpay Key ID', adminId);
          }
          return this.getSettings();
        } else if (parts[2] !== 'enabled') {
          // payments.razorpay.key_id -> payments.methods.razorpay.config.key_id
          normalizedPath = `payments.methods.${methodName}.config.${parts.slice(2).join('.')}`;
        } else {
          normalizedPath = `payments.methods.${methodName}.${parts.slice(2).join('.')}`;
        }
      }
    } else if (path.startsWith('shipping.') && !path.startsWith('shipping.providers.')) {
      // shipping.delhivery.enabled -> shipping.providers.delhivery.enabled
      const parts = path.split('.');
      if (parts.length >= 2) {
        const providerName = parts[1];
        if (parts.length === 2) {
          // shipping.delhivery -> shipping.providers.delhivery.enabled (if value is boolean)
          normalizedPath = `shipping.providers.${providerName}.enabled`;
        } else if (parts[2] === 'token') {
          // shipping.delhivery.token -> save to DELHIVERY_TOKEN in settings collection
          const { settingsService } = await import('./SettingsService');
          if (value === '' || value === null || value === undefined) {
            await settingsService.deleteSetting('DELHIVERY_TOKEN');
          } else {
            await settingsService.setSetting('DELHIVERY_TOKEN', value, 'string', 'Delhivery Token', adminId);
          }
          return this.getSettings();
        } else if (parts[2] === 'client_id') {
          // shipping.delhivery.client_id -> save to DELHIVERY_CLIENT_ID in settings collection
          const { settingsService } = await import('./SettingsService');
          if (value === '' || value === null || value === undefined) {
            await settingsService.deleteSetting('DELHIVERY_CLIENT_ID');
          } else {
            await settingsService.setSetting('DELHIVERY_CLIENT_ID', value, 'string', 'Delhivery Client ID', adminId);
          }
          return this.getSettings();
        } else if (parts[2] !== 'enabled') {
          // shipping.delhivery.other -> shipping.providers.delhivery.config.other
          normalizedPath = `shipping.providers.${providerName}.config.${parts.slice(2).join('.')}`;
        } else {
          normalizedPath = `shipping.providers.${providerName}.${parts.slice(2).join('.')}`;
        }
      }
    }

    const segments = normalizedPath.split('.');
    if (!segments.length) {
      return this.getSettings();
    }

    const patch: any = {};
    let cursor = patch;

    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        cursor[segment] = value;
        return;
      }

      cursor[segment] = {};
      cursor = cursor[segment];
    });

    return this.updateSettings(patch, adminId);
  }
}

export const platformSettingsService = new PlatformSettingsService();



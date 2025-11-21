import { Request, Response } from 'express';
import { z } from 'zod';
import { platformSettingsService } from '../services/PlatformSettingsService';
import { adminAuditService } from '../services/AdminAuditService';
import { razorpayService } from '../services/RazorpayService';

const toggleSchema = z.object({
  path: z.string(),
  value: z.any(),
});

const shippingSchema = z.object({
  provider: z.string(),
  enabled: z.boolean().optional(),
  config: z.record(z.any()).optional(),
});

const paymentSchema = z.object({
  method: z.string(),
  enabled: z.boolean(),
});

const emailSchema = z.object({
  key: z.enum(['enabled', 'transactional', 'marketing', 'productLaunch', 'announcements']),
  enabled: z.boolean(),
});

const themeScheduleSchema = z.object({
  themeId: z.string(),
  activateAt: z.string(),
});

const testRazorpaySchema = z.object({
  key_id: z.string().min(1, 'Key ID is required'),
  key_secret: z.string().min(1, 'Key Secret is required'),
});

const taxShippingSchema = z.object({
  taxRate: z.number().min(0).max(100).optional(),
  defaultShippingCost: z.number().min(0).optional(),
  shippingCalculationMethod: z.enum(['flat', 'dynamic']).optional(),
});

export class AdminSettingsController {
  static async getPlatformSettings(req: Request, res: Response): Promise<void> {
    const settings = await platformSettingsService.getSettings();
    
    // Flatten nested settings structure for frontend
    // Handles: payments.methods.razorpay.enabled -> payments.razorpay.enabled
    //         shipping.providers.delhivery.enabled -> shipping.delhivery.enabled
    const flatten = (obj: any, prefix = ''): Record<string, any> => {
      const flattened: Record<string, any> = {};
      for (const key in obj) {
        const value = obj[key];
        let newKey = prefix ? `${prefix}.${key}` : key;
        
        // Special handling for methods and providers to skip the intermediate level
        if (key === 'methods' && prefix === 'payments') {
          newKey = 'payments';
        } else if (key === 'providers' && prefix === 'shipping') {
          newKey = 'shipping';
        }
        
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && value !== null) {
          if (key === 'methods' && prefix === 'payments') {
            // Flatten payments.methods.razorpay -> payments.razorpay
            for (const methodKey in value) {
              const methodValue = value[methodKey];
              if (methodValue && typeof methodValue === 'object' && 'enabled' in methodValue) {
                flattened[`payments.${methodKey}.enabled`] = methodValue.enabled;
                // Handle config if it exists
                if (methodValue.config && typeof methodValue.config === 'object') {
                  for (const configKey in methodValue.config) {
                    flattened[`payments.${methodKey}.${configKey}`] = methodValue.config[configKey];
                  }
                }
              }
            }
          } else if (key === 'providers' && prefix === 'shipping') {
            // Flatten shipping.providers.delhivery -> shipping.delhivery
            for (const providerKey in value) {
              const providerValue = value[providerKey];
              if (providerValue && typeof providerValue === 'object' && 'enabled' in providerValue) {
                flattened[`shipping.${providerKey}.enabled`] = providerValue.enabled;
                // Handle config if it exists
                if (providerValue.config && typeof providerValue.config === 'object') {
                  for (const configKey in providerValue.config) {
                    flattened[`shipping.${providerKey}.${configKey}`] = providerValue.config[configKey];
                  }
                }
              }
            }
          } else {
            // Recursively flatten other nested objects
            Object.assign(flattened, flatten(value, newKey));
          }
        } else {
          flattened[newKey] = value;
        }
      }
      return flattened;
    };
    
    const flattened = flatten(settings);
    
    // Also fetch AI API keys from settings collection and AI settings
    const { settingsService } = await import('../services/SettingsService');
    const { aiService } = await import('../services/ai.service');
    
    // Get AI API keys from settings collection
    const geminiKey = await settingsService.getSetting('GEMINI_API_KEY');
    const openaiKey = await settingsService.getSetting('OPENAI_API_KEY');
    const anthropicKey = await settingsService.getSetting('ANTHROPIC_API_KEY');
    
    // Get AI model names from settings collection
    const geminiModel = await settingsService.getSetting('GEMINI_MODEL');
    const openaiModel = await settingsService.getSetting('OPENAI_MODEL');
    const anthropicModel = await settingsService.getSetting('ANTHROPIC_MODEL');
    
    // Get AI enabled status
    const aiSettings = await aiService.getSettings();
    
    // Explicitly set or remove AI API keys in flattened object
    // Remove keys that don't exist in database (explicitly set to undefined to ensure they're not in response)
    if (geminiKey) {
      flattened['ai.gemini.api_key'] = geminiKey;
    } else {
      delete flattened['ai.gemini.api_key'];
    }
    if (openaiKey) {
      flattened['ai.openai.api_key'] = openaiKey;
    } else {
      delete flattened['ai.openai.api_key'];
    }
    if (anthropicKey) {
      flattened['ai.anthropic.api_key'] = anthropicKey;
    } else {
      delete flattened['ai.anthropic.api_key'];
    }
    // Set model names
    if (geminiModel) {
      flattened['ai.gemini.model'] = geminiModel;
    } else {
      delete flattened['ai.gemini.model'];
    }
    if (openaiModel) {
      flattened['ai.openai.model'] = openaiModel;
    } else {
      delete flattened['ai.openai.model'];
    }
    if (anthropicModel) {
      flattened['ai.anthropic.model'] = anthropicModel;
    } else {
      delete flattened['ai.anthropic.model'];
    }
    flattened['ai.enabled'] = aiSettings.enabled;
    
    // Fetch Google OAuth secrets from settings collection
    const googleClientId = await settingsService.getSetting('GOOGLE_CLIENT_ID');
    const googleClientSecret = await settingsService.getSetting('GOOGLE_CLIENT_SECRET');
    if (googleClientId) {
      flattened['auth.google.client_id'] = googleClientId;
    } else {
      delete flattened['auth.google.client_id'];
    }
    if (googleClientSecret) {
      flattened['auth.google.client_secret'] = googleClientSecret;
    } else {
      delete flattened['auth.google.client_secret'];
    }
    
    // Fetch Razorpay secrets from settings collection
    const razorpayKeyId = await settingsService.getSetting('RAZORPAY_KEY_ID');
    const razorpayKeySecret = await settingsService.getSetting('RAZORPAY_KEY_SECRET');
    if (razorpayKeyId) {
      flattened['payments.razorpay.key_id'] = razorpayKeyId;
    } else {
      delete flattened['payments.razorpay.key_id'];
    }
    if (razorpayKeySecret) {
      flattened['payments.razorpay.key_secret'] = razorpayKeySecret;
    } else {
      delete flattened['payments.razorpay.key_secret'];
    }
    
    // Fetch Delhivery secrets from settings collection
    const delhiveryToken = await settingsService.getSetting('DELHIVERY_TOKEN');
    const delhiveryClientId = await settingsService.getSetting('DELHIVERY_CLIENT_ID');
    if (delhiveryToken) {
      flattened['shipping.delhivery.token'] = delhiveryToken;
    } else {
      delete flattened['shipping.delhivery.token'];
    }
    if (delhiveryClientId) {
      flattened['shipping.delhivery.client_id'] = delhiveryClientId;
    } else {
      delete flattened['shipping.delhivery.client_id'];
    }
    
    // Fetch SMTP secrets from settings collection
    const smtpUser = await settingsService.getSetting('SMTP_USER');
    const smtpPass = await settingsService.getSetting('SMTP_PASS');
    const smtpHost = await settingsService.getSetting('SMTP_HOST');
    const smtpPort = await settingsService.getSetting('SMTP_PORT');
    const smtpFromEmail = await settingsService.getSetting('SMTP_FROM_EMAIL');
    if (smtpHost) {
      flattened['email.smtp.host'] = smtpHost;
    } else {
      delete flattened['email.smtp.host'];
    }
    if (smtpPort) {
      flattened['email.smtp.port'] = parseInt(smtpPort) || 587;
    } else {
      delete flattened['email.smtp.port'];
    }
    if (smtpUser) {
      flattened['email.smtp.user'] = smtpUser;
    } else {
      delete flattened['email.smtp.user'];
    }
    if (smtpPass) {
      flattened['email.smtp.pass'] = smtpPass;
    } else {
      delete flattened['email.smtp.pass'];
    }
    if (smtpFromEmail) {
      flattened['email.smtp.from'] = smtpFromEmail;
    } else {
      delete flattened['email.smtp.from'];
    }
    
    res.json({ ok: true, data: flattened });
  }

  static async updateByPath(req: Request, res: Response): Promise<void> {
    try {
      const parsed = toggleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: 'Invalid payload', details: parsed.error.issues });
        return;
      }

      // Log SMTP-related updates for debugging
      if (parsed.data.path.includes('smtp')) {
        console.log(`[Settings] Updating SMTP setting: path="${parsed.data.path}", value type=${typeof parsed.data.value}, value length=${parsed.data.value ? String(parsed.data.value).length : 0}`);
      }

      const updated = await platformSettingsService.updatePath(parsed.data.path, parsed.data.value, req.userId);
      await adminAuditService.log(
        {
          action: 'update_settings_path',
          feature: parsed.data.path,
          newValue: parsed.data.value,
          adminId: req.userId,
        },
        req,
      );

      res.json({ ok: true, data: updated });
    } catch (error) {
      console.error('Error updating settings path:', error);
      res.status(500).json({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Failed to update settings' 
      });
    }
  }

  static async getShipping(req: Request, res: Response): Promise<void> {
    const shipping = await platformSettingsService.getSection('shipping');
    res.json({ ok: true, data: shipping });
  }

  static async updateShipping(req: Request, res: Response): Promise<void> {
    const parsed = shippingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'Invalid payload', details: parsed.error.issues });
      return;
    }

    const shipping = await platformSettingsService.getSection('shipping');
    const current = shipping.providers[parsed.data.provider] || {
      enabled: false,
      enabledAt: null,
      disabledAt: null,
      config: {},
    };

    const toggled = parsed.data.enabled ?? current.enabled;

    const updatedProvider = {
      ...current,
      enabled: toggled,
      enabledAt: toggled ? new Date().toISOString() : current.enabledAt,
      disabledAt: !toggled ? new Date().toISOString() : current.disabledAt,
      config: parsed.data.config ?? current.config,
    };

    const updated = await platformSettingsService.updateSection(
      'shipping',
      {
        providers: {
          ...shipping.providers,
          [parsed.data.provider]: updatedProvider,
        },
      },
      req.userId,
    );

    await adminAuditService.log(
      {
        action: 'toggle_shipping_provider',
        feature: parsed.data.provider,
        oldValue: current.enabled,
        newValue: toggled,
        adminId: req.userId,
      },
      req,
    );

    res.json({ ok: true, data: updated });
  }

  static async getPayments(req: Request, res: Response): Promise<void> {
    const payments = await platformSettingsService.getSection('payments');
    res.json({ ok: true, data: payments });
  }

  static async updatePaymentMethod(req: Request, res: Response): Promise<void> {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'Invalid payload', details: parsed.error.issues });
      return;
    }

    const payments = await platformSettingsService.getSection('payments');
    const current = payments.methods[parsed.data.method] || { enabled: false };

    const updated = await platformSettingsService.updateSection(
      'payments',
      {
        methods: {
          ...payments.methods,
          [parsed.data.method]: { enabled: parsed.data.enabled },
        },
      },
      req.userId,
    );

    await adminAuditService.log(
      {
        action: 'toggle_payment_method',
        feature: parsed.data.method,
        oldValue: current.enabled,
        newValue: parsed.data.enabled,
        adminId: req.userId,
      },
      req,
    );

    res.json({ ok: true, data: updated });
  }

  static async getEmailSettings(req: Request, res: Response): Promise<void> {
    const email = await platformSettingsService.getSection('email');
    res.json({ ok: true, data: email });
  }

  static async updateEmailSettings(req: Request, res: Response): Promise<void> {
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'Invalid payload', details: parsed.error.issues });
      return;
    }

    const email = await platformSettingsService.getSection('email');
    const key = parsed.data.key;

    const patch: any = {};
    if (key === 'enabled') {
      patch.enabled = parsed.data.enabled;
    } else {
      patch[key] = { enabled: parsed.data.enabled };
    }

    const updated = await platformSettingsService.updateSection('email', patch, req.userId);

    await adminAuditService.log(
      {
        action: 'toggle_email_feature',
        feature: `email.${key}`,
        oldValue: (email as any)[key]?.enabled ?? email.enabled,
        newValue: parsed.data.enabled,
        adminId: req.userId,
      },
      req,
    );

    res.json({ ok: true, data: updated });
  }

  static async getThemeSettings(req: Request, res: Response): Promise<void> {
    const theme = await platformSettingsService.getSection('theme');
    res.json({ ok: true, data: theme });
  }

  static async toggleThemeSystem(req: Request, res: Response): Promise<void> {
    const enabled = Boolean(req.body.enabled);
    const updated = await platformSettingsService.updateSection('theme', { enabled }, req.userId);

    await adminAuditService.log(
      {
        action: 'toggle_theme_system',
        newValue: enabled,
        adminId: req.userId,
      },
      req,
    );

    res.json({ ok: true, data: updated });
  }

  static async scheduleThemeActivation(req: Request, res: Response): Promise<void> {
    const parsed = themeScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'Invalid payload', details: parsed.error.issues });
      return;
    }

    const updated = await platformSettingsService.updateSection(
      'theme',
      {
        scheduledActivation: parsed.data,
      },
      req.userId,
    );

    await adminAuditService.log(
      {
        action: 'schedule_theme',
        feature: parsed.data.themeId,
        newValue: parsed.data.activateAt,
        adminId: req.userId,
      },
      req,
    );

    res.json({ ok: true, data: updated });
  }

  /**
   * POST /api/admin/settings/test-razorpay
   * Test Razorpay credentials by creating a minimal test order
   */
  static async testRazorpay(req: Request, res: Response): Promise<void> {
    try {
      const validated = testRazorpaySchema.parse(req.body);
      
      const isValid = await razorpayService.testCredentials(
        validated.key_id,
        validated.key_secret
      );
      
      if (isValid) {
        res.json({ 
          ok: true, 
          message: 'Razorpay credentials are valid',
        });
      } else {
        res.status(400).json({ 
          ok: false, 
          error: 'Invalid Razorpay credentials. Please check your Key ID and Key Secret.',
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: error.errors[0].message });
        return;
      }
      console.error('Error testing Razorpay credentials:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Failed to test Razorpay credentials',
      });
    }
  }

  static async getTaxShipping(req: Request, res: Response): Promise<void> {
    try {
      const settings = await platformSettingsService.getSettings();
      const taxShipping = settings.taxShipping || {
        taxRate: 18,
        defaultShippingCost: 0,
        shippingCalculationMethod: 'dynamic',
      };
      
      res.json({ ok: true, data: taxShipping });
    } catch (error) {
      console.error('Error getting tax/shipping settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get tax/shipping settings',
      });
    }
  }

  static async updateTaxShipping(req: Request, res: Response): Promise<void> {
    try {
      const parsed = taxShippingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ ok: false, error: 'Invalid payload', details: parsed.error.issues });
        return;
      }

      const current = await platformSettingsService.getSection('taxShipping');
      const updated = await platformSettingsService.updateSection(
        'taxShipping',
        {
          ...current,
          ...parsed.data,
        },
        req.userId,
      );

      await adminAuditService.log(
        {
          action: 'update_tax_shipping',
          feature: 'taxShipping',
          oldValue: current,
          newValue: updated,
          adminId: req.userId,
        },
        req,
      );

      res.json({ ok: true, data: updated });
    } catch (error) {
      console.error('Error updating tax/shipping settings:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to update tax/shipping settings',
      });
    }
  }
}



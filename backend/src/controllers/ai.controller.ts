import { Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.service';
import { sanitizeAIInput } from '../utils/sanitizeForAI';
import { settingsService } from '../services/SettingsService';
import { Config } from '../config/Config';

const productEnhanceSchema = z.object({
  productId: z.string().min(1),
  product: z.record(z.any()),
});

const adminProductSchema = z.object({
  product: z.record(z.any()),
});

const adminEmailSchema = z.object({
  theme: z.string().min(3),
  offer: z.string().optional(),
  audience: z.string().optional(),
  featuredProducts: z
    .array(
      z.object({
        name: z.string(),
        price: z.number().optional(),
      })
    )
    .optional(),
});

const adminSupportSchema = z.object({
  ticket: z.object({
    subject: z.string(),
    body: z.string(),
    tags: z.array(z.string()).optional(),
  }),
  knowledgeBase: z.string().optional(),
});

const adminAnalyticsSchema = z.object({
  salesSummary: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
      })
    )
    .default([]),
  weakCategories: z.array(z.string()).default([]),
});

const orderAssistSchema = z.object({
  question: z.string().min(5),
});

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  streamingEnabled: z.boolean().optional(),
  providerPriority: z.array(z.enum(['gemini', 'openai', 'anthropic'])).optional(),
  productPage: z
    .object({
      summary: z.boolean().optional(),
      highlights: z.boolean().optional(),
      comparisons: z.boolean().optional(),
      faqs: z.boolean().optional(),
    })
    .optional(),
  orderAssist: z
    .object({
      enabled: z.boolean().optional(),
      maxLookbackDays: z.number().min(7).max(365).optional(),
    })
    .optional(),
  adminTools: z
    .object({
      productDescription: z.boolean().optional(),
      productFAQ: z.boolean().optional(),
      supportReplies: z.boolean().optional(),
      emailGenerator: z.boolean().optional(),
      analytics: z.boolean().optional(),
    })
    .optional(),
});

export class AIController {
  static async getPublicSettings(_req: Request, res: Response): Promise<void> {
    const settings = await aiService.getSettings();
    res.json({
      ok: true,
      data: settings,
    });
  }

  static async productEnhancements(req: Request, res: Response): Promise<void> {
    try {
      const validated = productEnhanceSchema.parse(req.body);
      const enhancements = await aiService.productEnhancements(validated.productId, validated.product);
      res.json({
        ok: true,
        data: enhancements,
      });
    } catch (error) {
      AIController.handleError(res, error, 'Unable to enhance product');
    }
  }

  static async orderAssist(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ ok: false, error: 'Authentication required' });
        return;
      }
      const validated = orderAssistSchema.parse(req.body);
      const response = await aiService.orderAssist(req.userId, validated.question);
      res.json({
        ok: true,
        data: response,
      });
    } catch (error) {
      AIController.handleError(res, error, 'Unable to assist with order');
    }
  }

  /**
   * Admin endpoints
   */
  static async getAdminSettings(_req: Request, res: Response): Promise<void> {
    const settings = await aiService.getSettings();
    res.json({
      ok: true,
      data: settings,
    });
  }

  static async updateAdminSettings(req: Request, res: Response): Promise<void> {
    try {
      const validated = settingsSchema.parse(req.body);
      const updated = await aiService.updateSettings(validated);
      res.json({
        ok: true,
        data: updated,
      });
    } catch (error) {
      AIController.handleError(res, error, 'Unable to update AI settings');
    }
  }

  static async adminProductContent(req: Request, res: Response): Promise<void> {
    try {
      // Check if admin AI tools are enabled - check AI settings
      const aiSettings = await aiService.getSettings();
      const productDescEnabled = aiSettings.enabled && aiSettings.adminTools?.productDescription;
      
      if (!productDescEnabled) {
        res.status(403).json({
          ok: false,
          error: 'AI product description generator is currently disabled. Please enable AI and product description generator in AI Settings.',
        });
        return;
      }

      // Check if API key is available (check Config for any provider)
      // Check for API keys from DB
      const hasApiKey = Config.get('GEMINI_API_KEY') || Config.get('OPENAI_API_KEY') || Config.get('ANTHROPIC_API_KEY') || Config.get('OPENROUTER_API_KEY') || Config.get('LOCAL_LLM_URL');
      if (!hasApiKey) {
        res.status(403).json({
          ok: false,
          error: 'No AI provider API key configured. Please add an API key in Settings → AI Provider Settings.',
        });
        return;
      }

      const validated = adminProductSchema.parse(req.body);
      const result = await aiService.generateProductCopy(validated.product);
      res.json({ ok: true, data: result });
    } catch (error) {
      AIController.handleError(res, error, 'Unable to generate product copy');
    }
  }

  static async adminProductFAQ(req: Request, res: Response): Promise<void> {
    try {
      // Check if admin AI tools are enabled
      const aiSettings = await aiService.getSettings();
      const productFAQEnabled = aiSettings.enabled && aiSettings.adminTools?.productFAQ;
      
      if (!productFAQEnabled) {
        res.status(403).json({
          ok: false,
          error: 'AI product FAQ generator is currently disabled. Please enable AI and product FAQ generator in AI Settings.',
        });
        return;
      }

      // Check if API key is available
      const hasApiKey = Config.get('GEMINI_API_KEY') || Config.get('OPENAI_API_KEY') || Config.get('ANTHROPIC_API_KEY') || Config.get('OPENROUTER_API_KEY') || Config.get('LOCAL_LLM_URL');
      if (!hasApiKey) {
        res.status(403).json({
          ok: false,
          error: 'No AI provider API key configured. Please add an API key in Settings → AI Provider Settings.',
        });
        return;
      }

      const validated = adminProductSchema.parse(req.body);
      const result = await aiService.generateProductFAQ(validated.product);
      res.json({ ok: true, data: result });
    } catch (error) {
      AIController.handleError(res, error, 'Unable to generate product FAQ');
    }
  }

  static async adminEmail(req: Request, res: Response): Promise<void> {
    try {
      // Check if admin AI tools are enabled
      const emailGenEnabled = await settingsService.isFeatureEnabled('ai.admin.emailGenerator.enabled');
      if (!emailGenEnabled) {
        res.status(403).json({
          ok: false,
          error: 'AI email generator is currently disabled',
        });
        return;
      }

      const validated = adminEmailSchema.parse(req.body);
      const result = await aiService.generateEmailCampaign(validated);
      res.json({ ok: true, data: result });
    } catch (error) {
      AIController.handleError(res, error, 'Unable to generate email content');
    }
  }

  static async adminSupportReply(req: Request, res: Response): Promise<void> {
    try {
      // Check if admin AI tools are enabled
      const supportReplyEnabled = await settingsService.isFeatureEnabled('ai.admin.supportReply.enabled');
      if (!supportReplyEnabled) {
        res.status(403).json({
          ok: false,
          error: 'AI support reply generator is currently disabled',
        });
        return;
      }

      const validated = adminSupportSchema.parse(req.body);
      const result = await aiService.generateSupportReply(validated);
      res.json({ ok: true, data: result });
    } catch (error) {
      AIController.handleError(res, error, 'Unable to draft support reply');
    }
  }

  static async adminAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const validated = adminAnalyticsSchema.parse(req.body || {});
      const result = await aiService.analyticsInsights(validated);
      res.json({ ok: true, data: result });
    } catch (error) {
      AIController.handleError(res, error, 'Unable to generate analytics insights');
    }
  }

  /**
   * Helpers
   */
  private static handleError(res: Response, error: unknown, defaultMessage: string): void {
    if (error instanceof z.ZodError) {
      res.status(400).json({ ok: false, error: 'Validation failed', details: error.errors });
      return;
    }

    const safeMessage =
      error instanceof Error ? sanitizeAIInput(error.message, 200) : defaultMessage;
    const lowered = safeMessage.toLowerCase();
    const status =
      lowered.includes('disabled') || lowered.includes('unavailable') ? 403 : 500;

    if (status === 500) {
      console.error(defaultMessage, error);
    }

    res.status(status).json({
      ok: false,
      error: safeMessage,
    });
  }
}



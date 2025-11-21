import { ObjectId } from 'mongodb';
import { Config } from '../config/Config';
import { mongo } from '../db/Mongo';
import { productService } from './ProductService';
import { cartService, Cart } from './CartService';
import {
  AIAdminEmailContent,
  AIAdminProductContent,
  AIAdminSupportReply,
  AIAnalyticsInsight,
  AIChatMessage,
  AIOrderAssistResponse,
  AIProductEnhancement,
  AIProvider,
  AISettings,
  AIUseCase,
} from '../types/ai';
import { sanitizeAIInput, sanitizeAIOutput, redactSensitiveFields } from '../utils/sanitizeForAI';

interface ProviderConfig {
  name: AIProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

const SETTINGS_CACHE_TTL = 60 * 1000; // 1 minute

const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  streamingEnabled: Config.AI_STREAMING_ENABLED,
  providerPriority: [
    Config.AI_DEFAULT_PROVIDER,
    'openai',
    'gemini',
    'anthropic',
    'openrouter',
    'local',
  ],
  productPage: {
    summary: false,
    highlights: false,
    comparisons: false,
    faqs: false,
  },
  orderAssist: {
    enabled: true,
    maxLookbackDays: 120,
  },
  adminTools: {
    productDescription: true,
    productFAQ: true,
    supportReplies: true,
    emailGenerator: true,
    analytics: true,
  },
};

class AIService {
  private settingsCache: { value: AISettings; expiresAt: number } | null = null;
  private promptCache = new Map<string, { value: any; expiresAt: number }>();

  /**
   * Public getters
   */
  async getSettings(force = false): Promise<AISettings> {
    if (!force && this.settingsCache && this.settingsCache.expiresAt > Date.now()) {
      return this.settingsCache.value;
    }

    const db = mongo.getDb();
    const settingsCollection = db.collection('settings');
    const raw = await settingsCollection.findOne({ key: 'ai.settings' });

    let stored: Partial<AISettings> | undefined;
    if (raw && raw.value) {
      try {
        const parsed = typeof raw.value === 'string' ? JSON.parse(raw.value) : raw.value;
        // Remove deprecated properties (chatbot, recommendations, search)
        const { chatbot, recommendations, search, ...cleaned } = parsed;
        stored = cleaned;
      } catch (error) {
        console.warn('Failed to parse ai.settings, falling back to defaults', error);
      }
    }

    const merged: AISettings = {
      ...DEFAULT_AI_SETTINGS,
      ...(stored || {}),
      providerPriority: this.dedupeProviders(stored?.providerPriority),
    };

    this.settingsCache = {
      value: merged,
      expiresAt: Date.now() + SETTINGS_CACHE_TTL,
    };

    return merged;
  }

  async updateSettings(update: Partial<AISettings>): Promise<AISettings> {
    const db = mongo.getDb();
    const settingsCollection = db.collection('settings');
    const merged = {
      ...(await this.getSettings(true)),
      ...update,
      providerPriority: this.dedupeProviders(update.providerPriority),
    };

    await settingsCollection.updateOne(
      { key: 'ai.settings' },
      {
        $set: {
          key: 'ai.settings',
          value: JSON.stringify(merged),
          type: 'json',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    this.settingsCache = {
      value: merged,
      expiresAt: Date.now() + SETTINGS_CACHE_TTL,
    };

    return merged;
  }


  /**
   * Product enhancements for PDP
   */
  async productEnhancements(productId: string, productPayload: any): Promise<AIProductEnhancement> {
    const settings = await this.getSettings();
    const productInsightsEnabled =
      settings.enabled &&
      (settings.productPage.summary ||
        settings.productPage.highlights ||
        settings.productPage.comparisons ||
        settings.productPage.faqs);

    if (!productInsightsEnabled) {
      throw new Error('Product insights are disabled.');
    }

    const cacheKey = `product-enhancements:${productId}`;
    const cached = this.getCache<AIProductEnhancement>(cacheKey);
    if (cached) {
      return cached;
    }

    const prompt = [
      'Generate a concise summary, bullet highlights, comparable alternatives, and FAQs for the following product.',
      'Respond as JSON with keys summary, highlights, comparisons, faqs.',
      `Product data: ${JSON.stringify(redactSensitiveFields(productPayload))}`,
    ].join('\n');

    const completion = await this.callProvider(
      [
        { role: 'system', content: 'Return JSON with summary, highlights, comparisons, faqs.' },
        { role: 'user', content: prompt },
      ],
      { useCase: 'product-insights' }
    );

    let parsed: AIProductEnhancement = {
      summary: '',
      highlights: [],
      comparisons: [],
      faqs: [],
    };

    try {
      // Strip markdown code blocks if present (e.g., ```json ... ```)
      let cleanedCompletion = completion.trim();
      
      // Remove markdown code block markers
      if (cleanedCompletion.startsWith('```')) {
        // Find the first newline after ```
        const firstNewline = cleanedCompletion.indexOf('\n');
        if (firstNewline !== -1) {
          cleanedCompletion = cleanedCompletion.substring(firstNewline + 1);
        } else {
          // No newline, just remove the ```
          cleanedCompletion = cleanedCompletion.replace(/^```[a-z]*\s*/, '');
        }
      }
      
      // Remove trailing ```
      if (cleanedCompletion.endsWith('```')) {
        cleanedCompletion = cleanedCompletion.substring(0, cleanedCompletion.length - 3).trim();
      }
      
      // Parse the cleaned JSON
      parsed = JSON.parse(cleanedCompletion);
    } catch (error) {
      console.warn('Failed to parse product enhancement JSON', error);
      console.warn('Raw completion:', completion.substring(0, 200)); // Log first 200 chars for debugging
    }

    this.setCache(cacheKey, parsed);
    return parsed;
  }

  /**
   * Admin tooling
   */
  async generateProductCopy(productPayload: any): Promise<AIAdminProductContent> {
    await this.ensureAdminToolEnabled('productDescription');

    const prompt = [
      'Create detailed product marketing copy.',
      'Respond with JSON { longDescription, shortDescription, seoTitle, seoDescription, seoKeywords, bulletPoints }',
      `Product data: ${JSON.stringify(redactSensitiveFields(productPayload))}`,
    ].join('\n');

    const completion = await this.callProvider(
      [
        { role: 'system', content: 'Produce JSON only.' },
        { role: 'user', content: prompt },
      ],
      { useCase: 'product-content' }
    );

    if (!completion || completion.trim().length === 0) {
      throw new Error('AI service returned an empty response. Please check your API key and model configuration.');
    }

    return this.parseJsonResponse<AIAdminProductContent>(completion, {
      longDescription: '',
      shortDescription: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: [],
      bulletPoints: [],
    });
  }

  /**
   * Generate FAQ for a product
   */
  async generateProductFAQ(productPayload: any): Promise<Array<{ question: string; answer: string }>> {
    await this.ensureAdminToolEnabled('productFAQ');

    const prompt = [
      'Generate 5-7 frequently asked questions (FAQs) for the following product.',
      'Respond with JSON array: [{ question: string, answer: string }, ...]',
      'Make questions practical and answers helpful.',
      `Product data: ${JSON.stringify(redactSensitiveFields(productPayload))}`,
    ].join('\n');

    const completion = await this.callProvider(
      [
        { role: 'system', content: 'Return JSON array only with FAQ objects.' },
        { role: 'user', content: prompt },
      ],
      { useCase: 'product-content' }
    );

    if (!completion || completion.trim().length === 0) {
      throw new Error('AI service returned an empty response. Please check your API key and model configuration.');
    }

    try {
      // Strip markdown code blocks if present
      let cleanedCompletion = completion.trim();
      if (cleanedCompletion.startsWith('```')) {
        const firstNewline = cleanedCompletion.indexOf('\n');
        if (firstNewline !== -1) {
          cleanedCompletion = cleanedCompletion.substring(firstNewline + 1);
        } else {
          cleanedCompletion = cleanedCompletion.replace(/^```[a-z]*\s*/, '');
        }
      }
      if (cleanedCompletion.endsWith('```')) {
        cleanedCompletion = cleanedCompletion.substring(0, cleanedCompletion.length - 3).trim();
      }

      const parsed = JSON.parse(cleanedCompletion);
      // Ensure it's an array
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // If it's an object with faqs property
      if (parsed.faqs && Array.isArray(parsed.faqs)) {
        return parsed.faqs;
      }
      return [];
    } catch (error) {
      console.warn('Failed to parse FAQ JSON', error);
      console.warn('Raw completion:', completion.substring(0, 200));
      return [];
    }
  }

  async generateEmailCampaign(payload: {
    theme: string;
    offer?: string;
    audience?: string;
    featuredProducts?: Array<{ name: string; price: number }>;
  }): Promise<AIAdminEmailContent> {
    await this.ensureAdminToolEnabled('emailGenerator');

    const prompt = [
      'Write a marketing email for Handmade Harmony customers.',
      'CRITICAL: You MUST respond with valid JSON only. All strings must be properly escaped.',
      'Escape all quotes, newlines, and special characters in HTML and text fields.',
      'Respond as JSON with this exact structure:',
      '{',
      '  "subject": "string (max 100 chars)",',
      '  "preheader": "string (max 150 chars)",',
      '  "html": "string (properly escaped HTML)",',
      '  "plainText": "string (plain text version)",',
      '  "callToActions": ["string1", "string2"]',
      '}',
      'IMPORTANT: Use \\n for newlines, \\" for quotes, and ensure all strings are properly closed.',
      `Input: ${JSON.stringify(redactSensitiveFields(payload))}`,
    ].join('\n');

    const completion = await this.callProvider(
      [
        { role: 'system', content: 'You are a JSON generator. You MUST output valid, properly escaped JSON only. All string values must be properly escaped for JSON. Never output markdown code blocks, only raw JSON.' },
        { role: 'user', content: prompt },
      ],
      { useCase: 'email' }
    );

    return this.parseJsonResponse<AIAdminEmailContent>(completion, {
      subject: '',
      preheader: '',
      html: '',
      plainText: '',
      callToActions: [],
    });
  }

  async generateSupportReply(payload: {
    ticket: { subject: string; body: string; tags?: string[] };
    knowledgeBase?: string;
  }): Promise<AIAdminSupportReply> {
    await this.ensureAdminToolEnabled('supportReplies');

    const prompt = [
      'Draft a courteous support reply.',
      'Return JSON { suggestedReply, tone, tags, nextSteps }',
      `Ticket: ${JSON.stringify(redactSensitiveFields(payload.ticket))}`,
      payload.knowledgeBase ? `Knowledge base: ${payload.knowledgeBase}` : '',
    ].join('\n');

    const completion = await this.callProvider(
      [
        { role: 'system', content: 'Use JSON output only.' },
        { role: 'user', content: prompt },
      ],
      { useCase: 'support-reply' }
    );

    return this.parseJsonResponse<AIAdminSupportReply>(completion, {
      suggestedReply: '',
      tone: 'friendly',
      tags: [],
      nextSteps: [],
    });
  }

  async analyticsInsights(payload: {
    salesSummary: Array<{ label: string; value: number }>;
    weakCategories: string[];
  }): Promise<AIAnalyticsInsight> {
    await this.ensureAdminToolEnabled('analytics');

    const prompt = [
      'Provide concise sales insights for leadership.',
      'Return JSON { summary, trends, risks, opportunities }',
      `Sales data: ${JSON.stringify(payload)}`,
    ].join('\n');

    const completion = await this.callProvider(
      [
        { role: 'system', content: 'Output JSON only.' },
        { role: 'user', content: prompt },
      ],
      { useCase: 'analytics' }
    );

    return this.parseJsonResponse<AIAnalyticsInsight>(completion, {
      summary: '',
      trends: [],
      risks: [],
      opportunities: [],
    });
  }

  /**
   * Order assistant
   */
  async orderAssist(userId: string, question: string): Promise<AIOrderAssistResponse> {
    const settings = await this.getSettings();
    if (!settings.enabled || !settings.orderAssist.enabled) {
      throw new Error('Order assistant disabled.');
    }

    const orders = await this.getUserOrders(userId, settings.orderAssist.maxLookbackDays);
    const sanitizedQuestion = sanitizeAIInput(question);

    const prompt = [
      'You are the post-purchase assistant.',
      'Answer using ONLY the order data provided. Never guess address or payment details.',
      `Question: ${sanitizedQuestion}`,
      `Orders: ${JSON.stringify(orders)}`,
    ].join('\n');

    const completion = await this.callProvider(
      [
        { role: 'system', content: 'Respond in short helpful sentences. Never expose PII.' },
        { role: 'user', content: prompt },
      ],
      { useCase: 'order-assist' }
    );

    return {
      answer: sanitizeAIOutput(completion),
      referencedOrders: orders.map((order) => order.orderId),
    };
  }

  /**
   * Provider plumbing
   */
  private dedupeProviders(list?: AIProvider[]): AIProvider[] {
    const fallback: AIProvider[] = ['gemini', 'openai', 'anthropic'];
    const source = list && list.length > 0 ? list : fallback;
    const seen = new Set<AIProvider>();
    const providers: AIProvider[] = [];
    source.forEach((provider) => {
      if (provider && !seen.has(provider)) {
        seen.add(provider);
        providers.push(provider);
      }
    });
    return providers;
  }

  private getProviderConfig(settings?: AISettings): ProviderConfig | null {
    const order = settings?.providerPriority?.length
      ? settings.providerPriority
      : DEFAULT_AI_SETTINGS.providerPriority;

    for (const providerName of order) {
      const trimmed = providerName;
      // Load API keys from DB (via Config.get which checks DB first)
      const geminiKey = Config.get('GEMINI_API_KEY', '');
      if (trimmed === 'gemini' && geminiKey) {
        const model = Config.get('GEMINI_MODEL', 'gemini-1.5-pro');
        console.log(`[AI Service] Using Gemini provider with model: ${model}`);
        return {
          name: 'gemini',
          apiKey: geminiKey,
          model: model,
          baseUrl: 'https://generativelanguage.googleapis.com/v1/models',
        };
      }
      const openaiKey = Config.get('OPENAI_API_KEY', '');
      if (trimmed === 'openai' && openaiKey) {
        const model = Config.get('OPENAI_MODEL', 'gpt-4o-mini');
        console.log(`[AI Service] Using OpenAI provider with model: ${model}`);
        return {
          name: 'openai',
          apiKey: openaiKey,
          model: model,
          baseUrl: 'https://api.openai.com/v1',
        };
      }
      const anthropicKey = Config.get('ANTHROPIC_API_KEY', '');
      if (trimmed === 'anthropic' && anthropicKey) {
        const model = Config.get('ANTHROPIC_MODEL', 'claude-3-haiku-20240307');
        console.log(`[AI Service] Using Anthropic provider with model: ${model}`);
        return {
          name: 'anthropic',
          apiKey: anthropicKey,
          model: model,
          baseUrl: 'https://api.anthropic.com/v1',
        };
      }
      const openrouterKey = Config.get('OPENROUTER_API_KEY', '');
      if (trimmed === 'openrouter' && openrouterKey) {
        return {
          name: 'openrouter',
          apiKey: openrouterKey,
          model: Config.get('OPENROUTER_MODEL', 'openrouter/auto'),
          baseUrl: 'https://openrouter.ai/api/v1',
        };
      }
      const localLlmUrl = Config.get('LOCAL_LLM_URL', '');
      if (trimmed === 'local' && localLlmUrl) {
        return {
          name: 'local',
          apiKey: Config.get('LOCAL_LLM_API_KEY', ''),
          model: Config.get('LOCAL_LLM_MODEL', 'local-llm'),
          baseUrl: localLlmUrl,
        };
      }
    }

    return null;
  }

  private async callProvider(messages: AIChatMessage[], options: { temperature?: number; useCase?: AIUseCase; maxTokens?: number } = {}) {
    const settings = await this.getSettings();
    const provider = this.getProviderConfig(settings);

    if (!provider) {
      throw new Error('No AI provider is configured. Please add an API key in Settings → AI Provider Settings.');
    }

    if (!provider.apiKey || provider.apiKey.trim() === '') {
      throw new Error(`The ${provider.name} API key is missing or invalid. Please configure it in Settings → AI Provider Settings.`);
    }

    // Set default max tokens based on use case
    const maxTokens = options.maxTokens || (options.useCase === 'email' ? 2048 : 1024);

    switch (provider.name) {
      case 'openai':
        return this.callOpenAI(provider, messages, options.temperature, maxTokens);
      case 'anthropic':
        return this.callAnthropic(provider, messages, options.temperature, maxTokens);
      case 'openrouter':
        return this.callOpenRouter(provider, messages, options.temperature, maxTokens);
      case 'local':
        return this.callLocalProvider(provider, messages, options.temperature, maxTokens);
      case 'gemini':
      default:
        return this.callGemini(provider, messages, options.temperature, maxTokens);
    }
  }

  private async callGemini(provider: ProviderConfig, messages: AIChatMessage[], temperature = 0.6, maxTokens = 1024): Promise<string> {
    if (!provider.apiKey || provider.apiKey.trim() === '') {
      throw new Error('Gemini API key is missing or invalid. Please configure it in Settings → AI Provider Settings.');
    }

    const prompt = messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    try {
      const response = await fetch(`${provider.baseUrl}/${provider.model}:generateContent?key=${provider.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API error:', errorData);
        
        // Provide more specific error messages
        if (response.status === 400) {
          throw new Error('Invalid request to Gemini API. Please check your API key and try again.');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Gemini API key is invalid or expired. Please update it in Settings → AI Provider Settings.');
        } else if (response.status === 429) {
          throw new Error('Gemini API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Gemini API request failed: ${errorData.error?.message || 'Unknown error'}`);
        }
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('Gemini API returned an empty response. Please try again.');
      }
      
      return text;
    } catch (error) {
      // Re-throw if it's already a formatted error
      if (error instanceof Error && error.message.includes('API')) {
        throw error;
      }
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Gemini API. Please check your internet connection.');
      }
      // Re-throw other errors
      throw error;
    }
  }

  private async callOpenAI(provider: ProviderConfig, messages: AIChatMessage[], temperature = 0.6, maxTokens = 1024): Promise<string> {
    const chatMessages = messages.map((msg) => ({
      role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature,
        max_tokens: maxTokens,
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI error', errorData);
      throw new Error('OpenAI request failed');
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || 'I could not generate a result.';
  }

  private async callAnthropic(provider: ProviderConfig, messages: AIChatMessage[], temperature = 0.5, maxTokens = 1024): Promise<string> {
    const systemMessage = messages.find((msg) => msg.role === 'system');
    const nonSystem = messages.filter((msg) => msg.role !== 'system');

    const payload: Record<string, any> = {
      model: provider.model,
      temperature,
      max_tokens: maxTokens,
      messages: nonSystem.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    };

    if (systemMessage) {
      payload.system = systemMessage.content;
    }

    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic error', errorData);
      throw new Error('Anthropic request failed');
    }

    const data = await response.json();
    return data?.content?.[0]?.text || 'I could not generate a result.';
  }

  private async callOpenRouter(provider: ProviderConfig, messages: AIChatMessage[], temperature = 0.6, maxTokens = 1024): Promise<string> {
    const payload = {
      model: provider.model,
      temperature,
      messages: messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
        content: msg.content,
      })),
    };

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
        'HTTP-Referer': Config.APP_URL,
        'X-Title': Config.APP_NAME,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter error', errorData);
      throw new Error('OpenRouter request failed');
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || 'I could not generate a result.';
  }

  private async callLocalProvider(provider: ProviderConfig, messages: AIChatMessage[], temperature = 0.6, maxTokens = 1024): Promise<string> {
    const payload = {
      model: provider.model,
      temperature,
      max_tokens: maxTokens,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider.apiKey) {
      headers.Authorization = `Bearer ${provider.apiKey}`;
    }

    const response = await fetch(provider.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Local LLM error', errorData);
      throw new Error('Local model request failed');
    }

    const data = await response.json();
    if (data?.choices?.length) {
      return data.choices[0].message?.content || data.choices[0].text || '';
    }
    if (data?.generated_text) {
      return data.generated_text;
    }
    if (typeof data === 'string') {
      return data;
    }
    return 'Local model returned no text.';
  }


  /**
   * Context builders
   */
  private async buildUserContext(userId?: string, sessionId?: string): Promise<{
    cartSummary: string;
    orderSummary: string;
  }> {
    const cart = await cartService.getCart(userId, sessionId);
    const cartSummary = this.formatCartSummary(cart);

    const orders = userId ? await this.getUserOrders(userId) : [];
    const orderSummary = orders
      .map(
        (order) =>
          `Order ${order.orderId} (${order.status}) - ₹${order.total} on ${order.placedAt} | Items: ${order.items
            .map((item: any) => `${item.name} x${item.qty}`)
            .join(', ')}`
      )
      .join('\n');

    return {
      cartSummary,
      orderSummary,
    };
  }

  private formatCartSummary(cart: Cart | null): string {
    if (!cart || cart.items.length === 0) {
      return 'Cart is empty.';
    }

    return cart.items
      .map((item) => `• ${item.name || item.productId} x${item.qty}`)
      .join('\n');
  }

  private async getProductSnapshot(limit: number): Promise<string> {
    const cacheKey = `product-snapshot:${limit}`;
    const cached = this.getCache<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const { products } = await productService.listProducts({
      page: 1,
      limit,
      skip: 0,
      status: 'active',
    });

    const snapshot = products
      .map((product) => `• ${product.name} (₹${product.price})`)
      .join('\n');

    this.setCache(cacheKey, snapshot);
    return snapshot;
  }


  private async getUserOrders(userId: string, maxDays: number = 120) {
    const db = mongo.getDb();
    const ordersCollection = db.collection('orders');
    const since = new Date();
    since.setDate(since.getDate() - maxDays);

    const orders = await ordersCollection
      .find({
        userId,
        placedAt: { $gte: since },
      })
      .sort({ placedAt: -1 })
      .limit(5)
      .project({
        _id: 1,
        status: 1,
        amount: 1,
        payment: 1,
        items: {
          name: 1,
          qty: 1,
        },
        placedAt: 1,
      })
      .toArray();

    return orders.map((order: any) => ({
      orderId: order._id?.toString() || '',
      status: order.status,
      total: order.payment?.amountPaid || order.amount,
      placedAt: order.placedAt,
      items: order.items || [],
    }));
  }

  private extractSuggestions(message: string): string[] | undefined {
    const matches = message.match(/suggestions?:\s*(.+)/i);
    if (!matches) {
      return undefined;
    }
    return matches[1]
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  /**
   * Simple in-memory cache for repeated prompts
   */
  private getCache<T>(key: string): T | undefined {
    const entry = this.promptCache.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      this.promptCache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  private setCache<T>(key: string, value: T, ttlSeconds: number = Config.AI_CACHE_TTL_SECONDS) {
    this.promptCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private parseJsonResponse<T>(raw: string, fallback: T): T {
    try {
      // Try to extract JSON from markdown code blocks if present
      let cleaned = raw.trim();
      
      // Remove markdown code blocks if present (handles ```json, ```, or just ```)
      // Use string manipulation for more reliable extraction
      if (cleaned.startsWith('```')) {
        // Find the first occurrence of ``` and extract content until the last ```
        const startIndex = cleaned.indexOf('```');
        let afterStart = cleaned.substring(startIndex + 3); // Skip past first ```
        
        // Remove "json" if it's immediately after the opening ```
        if (afterStart.toLowerCase().startsWith('json')) {
          afterStart = afterStart.substring(4);
        }
        
        // Find the last occurrence of ```
        const lastIndex = afterStart.lastIndexOf('```');
        if (lastIndex > 0) {
          cleaned = afterStart.substring(0, lastIndex).trim();
        } else {
          // If no closing ``` found, try to extract JSON object directly
          cleaned = afterStart.trim();
        }
      }
      
      // If still not valid JSON, try to find JSON object in the text
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        const jsonObjectMatch = cleaned.match(/(\{[\s\S]*\})/);
        if (jsonObjectMatch && jsonObjectMatch[1]) {
          cleaned = jsonObjectMatch[1];
        }
      }
      
      // Final cleanup - remove any leading/trailing whitespace
      cleaned = cleaned.trim();
      
      // Try to fix common JSON issues before parsing
      cleaned = this.fixCommonJsonIssues(cleaned);
      
      // Parse the JSON
      const parsed = JSON.parse(cleaned);
      
      // Validate that we got meaningful data (not all empty)
      const hasData = Object.values(parsed).some((val: any) => {
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === 'string') return val.trim().length > 0;
        return val !== null && val !== undefined;
      });
      
      if (!hasData) {
        console.warn('AI returned empty data structure', parsed);
        throw new Error('AI returned empty response');
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse AI JSON payload:', error);
      console.error('Raw response (first 1000 chars):', raw.substring(0, 1000));
      console.error('Raw response (last 500 chars):', raw.substring(Math.max(0, raw.length - 500)));
      
      // Try to provide more helpful error message
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      let helpfulMessage = `Failed to parse AI response: ${errorMessage}`;
      
      if (errorMessage.includes('Unterminated string')) {
        helpfulMessage += '. The AI response contains unescaped quotes or special characters. Please try again or adjust your input.';
      } else if (errorMessage.includes('Unexpected token')) {
        helpfulMessage += '. The AI response format is invalid. Please try again.';
      }
      
      throw new Error(helpfulMessage);
    }
  }

  /**
   * Attempts to fix common JSON issues that can occur in AI responses
   * This is a best-effort approach to handle malformed JSON from AI models
   */
  private fixCommonJsonIssues(jsonString: string): string {
    let fixed = jsonString;
    
    // Try to fix unterminated strings by finding unclosed quotes before the final brace
    const lastBraceIndex = fixed.lastIndexOf('}');
    if (lastBraceIndex > 0) {
      const beforeBrace = fixed.substring(0, lastBraceIndex);
      const afterBrace = fixed.substring(lastBraceIndex);
      
      // Count unescaped quotes in the section before the final brace
      let quoteCount = 0;
      let escapeNext = false;
      for (let i = 0; i < beforeBrace.length; i++) {
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (beforeBrace[i] === '\\') {
          escapeNext = true;
          continue;
        }
        if (beforeBrace[i] === '"') {
          quoteCount++;
        }
      }
      
      // If we have an odd number of quotes, we likely have an unterminated string
      // Try to close it before the final brace
      if (quoteCount % 2 === 1 && !beforeBrace.trim().endsWith('"')) {
        // Find the last quote position
        const lastQuote = beforeBrace.lastIndexOf('"');
        const afterLastQuote = beforeBrace.substring(lastQuote + 1);
        
        // Check if there's content after the last quote that should be part of the string
        // If there's content and it doesn't end with a quote, we need to close it
        if (afterLastQuote.trim().length > 0 && !afterLastQuote.trim().endsWith('"')) {
          // Try to find where the string should end (before comma, colon, or brace)
          const nextComma = afterLastQuote.indexOf(',');
          const nextColon = afterLastQuote.indexOf(':');
          const nextBrace = afterLastQuote.indexOf('}');
          
          let insertPos = afterLastQuote.length;
          if (nextComma > 0 && nextComma < insertPos) insertPos = nextComma;
          if (nextColon > 0 && nextColon < insertPos) insertPos = nextColon;
          if (nextBrace > 0 && nextBrace < insertPos) insertPos = nextBrace;
          
          // If we found a structural character, insert the quote before it
          if (insertPos < afterLastQuote.length) {
            const beforeInsert = beforeBrace.substring(0, lastQuote + 1 + insertPos);
            const afterInsert = beforeBrace.substring(lastQuote + 1 + insertPos);
            fixed = beforeInsert + '"' + afterInsert + afterBrace;
          } else {
            // No structural character found, close it right before the final brace
            fixed = beforeBrace + '"' + afterBrace;
          }
        }
      }
    }
    
    return fixed;
  }

  private async ensureAdminToolEnabled(tool: keyof AISettings['adminTools']): Promise<AISettings> {
    const settings = await this.getSettings();
    if (!settings.enabled || !settings.adminTools[tool]) {
      throw new Error('Requested AI admin tool is disabled.');
    }
    return settings;
  }
}

export const aiService = new AIService();



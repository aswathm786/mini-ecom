/**
 * AI Types
 *
 * Shared interfaces and enums used by AI service, controllers, and frontend.
 */

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'local';

export type AIUseCase =
  | 'product-content'
  | 'email'
  | 'support-reply'
  | 'analytics'
  | 'order-assist'
  | 'product-insights';

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProductEnhancement {
  summary: string;
  highlights: string[];
  comparisons: Array<{
    productId?: string;
    title: string;
    benefit: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

export interface AIAdminProductContent {
  longDescription: string;
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  bulletPoints: string[];
}

export interface AIAdminEmailContent {
  subject: string;
  preheader: string;
  html: string;
  plainText: string;
  callToActions: string[];
}

export interface AIAdminSupportReply {
  suggestedReply: string;
  tone: string;
  tags: string[];
  nextSteps: string[];
}

export interface AIAnalyticsInsight {
  summary: string;
  trends: string[];
  risks: string[];
  opportunities: string[];
}

export interface AIOrderAssistResponse {
  answer: string;
  referencedOrders: string[];
}

export interface AISettings {
  enabled: boolean;
  streamingEnabled: boolean;
  providerPriority: AIProvider[];
  productPage: {
    summary: boolean;
    highlights: boolean;
    comparisons: boolean;
    faqs: boolean;
  };
  orderAssist: {
    enabled: boolean;
    maxLookbackDays: number;
  };
  adminTools: {
    productDescription: boolean;
    productFAQ: boolean;
    supportReplies: boolean;
    emailGenerator: boolean;
    analytics: boolean;
  };
}



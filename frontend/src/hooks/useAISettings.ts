import { useCallback, useEffect, useState } from 'react';

export interface FrontendAISettings {
  enabled: boolean;
  streamingEnabled: boolean;
  providerPriority: Array<'gemini' | 'openai' | 'anthropic'>;
  productPage: {
    summary: boolean;
    highlights: boolean;
    comparisons: boolean;
    faqs: boolean;
  };
  orderAssist: {
    enabled: boolean;
  };
  adminTools: {
    productDescription: boolean;
    productFAQ: boolean;
    supportReplies: boolean;
    emailGenerator: boolean;
    analytics: boolean;
  };
}

interface UseAISettingsResult {
  settings: FrontendAISettings | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAISettings(): UseAISettingsResult {
  const [settings, setSettings] = useState<FrontendAISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/settings', { credentials: 'include' });
      if (!response.ok) {
        // If settings fail to load, use default empty settings instead of throwing
        setSettings({
          enabled: false,
          streamingEnabled: false,
          providerPriority: [],
          productPage: {
            summary: false,
            highlights: false,
            comparisons: false,
            faqs: false,
          },
          orderAssist: {
            enabled: false,
          },
          adminTools: {
            productDescription: false,
            productFAQ: false,
            supportReplies: false,
            emailGenerator: false,
            analytics: false,
          },
        });
        return;
      }
      const data = await response.json();
      // Clean up any deprecated properties that might come from backend
      const cleaned = data.data || data;
      if (cleaned) {
        const { search, chatbot, recommendations, ...sanitized } = cleaned;
        setSettings(sanitized);
      }
    } catch (err) {
      // Silently fail and use default settings
      setSettings({
        enabled: false,
        streamingEnabled: false,
        providerPriority: [],
        productPage: {
          summary: false,
          highlights: false,
          comparisons: false,
          faqs: false,
        },
        orderAssist: {
          enabled: false,
        },
          adminTools: {
            productDescription: false,
            productFAQ: false,
          supportReplies: false,
          emailGenerator: false,
          analytics: false,
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    refresh: loadSettings,
  };
}



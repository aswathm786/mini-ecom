/**
 * Inline AI FAQ Generator Component
 * 
 * Used in product forms to generate FAQs using AI
 */

import { useState } from 'react';
import { csrfFetch } from '../../../lib/csrfFetch';
import { useAIContext } from '../../../contexts/AIContext';
import { Button } from '../../../components/Button';

interface FAQ {
  question: string;
  answer: string;
}

interface ProductFAQAIGeneratorProps {
  productName: string;
  productDescription?: string;
  currentFAQ?: FAQ[];
  onFAQGenerated: (faqs: FAQ[]) => void;
  disabled?: boolean;
}

export function ProductFAQAIGenerator({
  productName,
  productDescription,
  currentFAQ,
  onFAQGenerated,
  disabled = false,
}: ProductFAQAIGeneratorProps) {
  const { settings, loading: settingsLoading } = useAIContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wait for settings to load
  if (settingsLoading) {
    return null;
  }

  // Debug: Log settings to help troubleshoot
  if (process.env.NODE_ENV === 'development') {
    console.log('ProductFAQAIGenerator - Settings:', {
      enabled: settings?.enabled,
      productFAQ: settings?.adminTools?.productFAQ,
      allAdminTools: settings?.adminTools,
    });
  }

  const isAIEnabled = settings?.enabled && settings?.adminTools?.productFAQ;

  if (!isAIEnabled) {
    // In development, show why it's disabled
    if (process.env.NODE_ENV === 'development' && settings) {
      console.warn('ProductFAQAIGenerator disabled:', {
        'AI enabled': settings.enabled,
        'FAQ enabled': settings.adminTools?.productFAQ,
      });
    }
    return null;
  }

  const handleGenerate = async () => {
    if (!productName.trim()) {
      setError('Product name is required to generate FAQ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        product: {
          name: productName.trim(),
          description: productDescription || '',
        },
      };

      const response = await csrfFetch<FAQ[]>('/api/ai/admin/product-faq', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Unable to generate FAQ');
      }

      if (Array.isArray(response.data) && response.data.length > 0) {
        onFAQGenerated(response.data);
      } else {
        setError('No FAQ was generated');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate FAQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={disabled || loading || !productName.trim()}
        isLoading={loading}
      >
        {loading ? 'Generating...' : '✨ Generate FAQ with AI'}
      </Button>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}


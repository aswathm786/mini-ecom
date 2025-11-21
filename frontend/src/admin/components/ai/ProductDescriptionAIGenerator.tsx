/**
 * Inline AI Description Generator Component
 * 
 * Used in product forms to generate descriptions using AI
 */

import { useState } from 'react';
import { csrfFetch } from '../../../lib/csrfFetch';
import { useAIContext } from '../../../contexts/AIContext';
import { Button } from '../../../components/Button';

interface ProductDescriptionAIGeneratorProps {
  productName: string;
  currentDescription?: string;
  onDescriptionGenerated: (description: string) => void;
  disabled?: boolean;
}

export function ProductDescriptionAIGenerator({
  productName,
  currentDescription,
  onDescriptionGenerated,
  disabled = false,
}: ProductDescriptionAIGeneratorProps) {
  const { settings, loading: settingsLoading } = useAIContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wait for settings to load
  if (settingsLoading) {
    return null;
  }

  // Debug: Log settings to help troubleshoot
  if (process.env.NODE_ENV === 'development') {
    console.log('ProductDescriptionAIGenerator - Settings:', {
      enabled: settings?.enabled,
      productDescription: settings?.adminTools?.productDescription,
      allAdminTools: settings?.adminTools,
    });
  }

  const isAIEnabled = settings?.enabled && settings?.adminTools?.productDescription;

  if (!isAIEnabled) {
    // In development, show why it's disabled
    if (process.env.NODE_ENV === 'development' && settings) {
      console.warn('ProductDescriptionAIGenerator disabled:', {
        'AI enabled': settings.enabled,
        'Description enabled': settings.adminTools?.productDescription,
      });
    }
    return null;
  }

  const handleGenerate = async () => {
    if (!productName.trim()) {
      setError('Product name is required to generate description');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        product: {
          name: productName.trim(),
          description: currentDescription || '',
        },
      };

      const response = await csrfFetch<{
        longDescription: string;
        shortDescription: string;
      }>('/api/ai/admin/product-content', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Unable to generate description');
      }

      // Use longDescription as the main description
      const generatedDescription = response.data.longDescription || response.data.shortDescription || '';
      if (generatedDescription) {
        onDescriptionGenerated(generatedDescription);
      } else {
        setError('No description was generated');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate description');
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
        {loading ? 'Generating...' : '✨ Generate Description with AI'}
      </Button>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}


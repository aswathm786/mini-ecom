import { useEffect, useState } from 'react';
import { useAIContext } from '../../contexts/AIContext';
import { csrfFetch } from '../../lib/csrfFetch';
import type { Product } from '../../hooks/useProducts';

interface AISuggestionsProps {
  variant: 'product';
  product?: Product | null;
}

interface AIProductEnhancement {
  summary: string;
  highlights: string[];
  comparisons: Array<{ title: string; benefit: string }>;
  faqs: Array<{ question: string; answer: string }>;
}

export function AISuggestions({ variant, product }: AISuggestionsProps) {
  const { settings } = useAIContext();
  const [enhancements, setEnhancements] = useState<AIProductEnhancement | null>(null);
  const [enhancementLoading, setEnhancementLoading] = useState(false);
  const [enhancementError, setEnhancementError] = useState<string | null>(null);

  const showProductInsights =
    settings?.enabled &&
    variant === 'product' &&
    product &&
    (settings.productPage.summary ||
      settings.productPage.highlights ||
      settings.productPage.comparisons ||
      settings.productPage.faqs);

  useEffect(() => {
    if (!showProductInsights || !product) return;
    let mounted = true;
    setEnhancementLoading(true);
    setEnhancementError(null);

    const payload = {
      productId: product._id,
      product: {
        name: product.name,
        description: product.description,
        price: product.price,
        categoryId: product.categoryId,
      },
    };

    csrfFetch<AIProductEnhancement>('/api/ai/product-enhancements', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!mounted) return;
        if (response.ok && response.data) {
          setEnhancements(response.data);
          setEnhancementError(null);
        } else {
          // Only set error for non-403 errors (403 means AI is disabled, which is expected)
          if (response.code !== 'FORBIDDEN') {
            setEnhancementError(response.error || 'Unable to enhance product');
          } else {
            // 403 means AI is disabled - this is expected, don't show error
            setEnhancementError(null);
          }
        }
      })
      .catch((error) => {
        if (!mounted) return;
        // Suppress errors for 403 (AI disabled) - this is expected behavior
        const errorMessage = error instanceof Error ? error.message : 'Enhancement unavailable';
        if (!errorMessage.includes('403') && !errorMessage.includes('Forbidden')) {
          setEnhancementError(errorMessage);
        } else {
          // AI is disabled - expected, don't show error
          setEnhancementError(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setEnhancementLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [showProductInsights, product?._id]);

  if (!showProductInsights) {
    return null;
  }

  const renderEnhancements = () => {
    if (!showProductInsights) {
      return null;
    }

    if (enhancementLoading) {
      return (
        <div className="mt-6 space-y-4">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      );
    }

    if (enhancementError || !enhancements) {
      return <p className="text-sm text-gray-500">{enhancementError || 'Insights unavailable'}</p>;
    }

    return (
      <div className="space-y-6">
        {settings?.productPage.summary && enhancements.summary && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">In a nutshell</h4>
            <p className="text-gray-700">{enhancements.summary}</p>
          </div>
        )}

        {settings?.productPage.highlights && enhancements.highlights?.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Highlights</h4>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              {enhancements.highlights.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {settings?.productPage.comparisons && enhancements.comparisons?.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Compare options</h4>
            <div className="space-y-3">
              {enhancements.comparisons.map((item) => (
                <div key={item.title} className="p-3 border border-gray-200 rounded-lg">
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.benefit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {settings?.productPage.faqs && enhancements.faqs?.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Product FAQs</h4>
            <div className="space-y-2">
              {enhancements.faqs.map((faq) => (
                <details key={faq.question} className="border border-gray-200 rounded-lg p-3">
                  <summary className="font-medium text-gray-900 cursor-pointer">{faq.question}</summary>
                  <p className="text-sm text-gray-600 mt-2">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mt-12 bg-gray-50 rounded-3xl p-6">
      {variant === 'product' && (
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900">AI buying companion</h3>
          <p className="text-sm text-gray-600">Fast summary, highlights, and matching accessories</p>
        </div>
      )}

      {renderEnhancements()}
    </section>
  );
}



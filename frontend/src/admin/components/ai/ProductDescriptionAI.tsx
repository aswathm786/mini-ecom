import { useState } from 'react';
import { csrfFetch } from '../../../lib/csrfFetch';
import { useAIContext } from '../../../contexts/AIContext';

interface AIProductCopy {
  longDescription: string;
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[] | string;
  bulletPoints: string[] | string;
}

export function ProductDescriptionAI() {
  const { settings } = useAIContext();
  const [form, setForm] = useState({
    name: '',
    attributes: '',
    tone: 'friendly',
  });
  const [result, setResult] = useState<AIProductCopy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!settings?.adminTools.productDescription) {
    return null;
  }

  const handleGenerate = async () => {
    if (!form.name.trim()) {
      setError('Product name is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        product: {
          name: form.name.trim(),
          description: form.attributes,
          tone: form.tone,
        },
      };
      const response = await csrfFetch<AIProductCopy>('/api/ai/admin/product-content', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Unable to generate copy');
      }

      setResult(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Product Copy</h3>
          <p className="text-sm text-gray-500">Generate long & short descriptions with SEO metadata.</p>
        </div>
        <span className="text-2xl">✨</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Product name</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            placeholder="Midnight Bloom Ceramic Vase"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Highlights / materials / vibe</label>
          <textarea
            value={form.attributes}
            onChange={(event) => setForm({ ...form, attributes: event.target.value })}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            rows={3}
            placeholder="Hand-painted, matte finish, boho décor, eco-conscious clay"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Tone</label>
          <select
            value={form.tone}
            onChange={(event) => setForm({ ...form, tone: event.target.value })}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
          >
            <option value="friendly">Friendly & warm</option>
            <option value="luxury">Luxury & premium</option>
            <option value="playful">Playful</option>
            <option value="minimal">Minimal & clean</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
        >
          {loading ? 'Crafting copy…' : 'Generate descriptions'}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="mt-4 space-y-3">
            <section>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Short blurb</h4>
              <p className="text-sm text-gray-700 mt-1">{result.shortDescription}</p>
            </section>
            <section>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Long description</h4>
              <p className="text-sm text-gray-700 whitespace-pre-line mt-1">{result.longDescription}</p>
            </section>
            {result.bulletPoints && (Array.isArray(result.bulletPoints) ? result.bulletPoints.length > 0 : result.bulletPoints) && (
              <section>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Highlights</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mt-1">
                  {Array.isArray(result.bulletPoints) 
                    ? result.bulletPoints.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))
                    : <li>{result.bulletPoints}</li>
                  }
                </ul>
              </section>
            )}
            <section>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">SEO</h4>
              <p className="text-xs text-gray-600 mt-1">
                <strong>Title:</strong> {result.seoTitle}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <strong>Description:</strong> {result.seoDescription}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <strong>Keywords:</strong> {Array.isArray(result.seoKeywords) 
                  ? result.seoKeywords.join(', ') 
                  : result.seoKeywords || 'N/A'}
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}



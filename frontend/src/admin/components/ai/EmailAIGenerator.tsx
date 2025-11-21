import { useState } from 'react';
import { csrfFetch } from '../../../lib/csrfFetch';
import { useAIContext } from '../../../contexts/AIContext';

interface AIEmailContent {
  subject: string;
  preheader: string;
  html: string;
  plainText: string;
  callToActions: string[];
}

export function EmailAIGenerator() {
  const { settings } = useAIContext();
  const [theme, setTheme] = useState('New collection drop');
  const [offer, setOffer] = useState('Flat 15% on launch weekend');
  const [audience, setAudience] = useState('loyal customers');
  const [result, setResult] = useState<AIEmailContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!settings?.adminTools.emailGenerator) {
    return null;
  }

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await csrfFetch<AIEmailContent>('/api/ai/admin/email', {
        method: 'POST',
        body: JSON.stringify({
          theme,
          offer,
          audience,
        }),
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Unable to craft email');
      }

      setResult(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to craft email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Email Generator</h3>
          <p className="text-sm text-gray-500">Get ready-to-send HTML emails with CTA ideas.</p>
        </div>
        <span className="text-2xl">📧</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Campaign theme</label>
          <input
            type="text"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Offer or highlight</label>
          <input
            type="text"
            value={offer}
            onChange={(event) => setOffer(event.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Audience</label>
          <input
            type="text"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
        >
          {loading ? 'Designing email…' : 'Generate email'}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="mt-4 space-y-3">
            <section>
              <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Subject</p>
              <p className="text-base font-medium text-gray-900">{result.subject}</p>
              <p className="text-xs text-gray-500 mt-1">{result.preheader}</p>
            </section>
            <section>
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Preview</p>
              <div
                className="mt-2 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 bg-gray-50"
                dangerouslySetInnerHTML={{ __html: result.html }}
              />
            </section>
            <section>
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Call-to-actions</p>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mt-1">
                {result.callToActions.map((cta) => (
                  <li key={cta}>{cta}</li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}



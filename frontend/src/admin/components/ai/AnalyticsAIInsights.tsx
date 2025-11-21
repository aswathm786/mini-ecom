import { useState } from 'react';
import { csrfFetch } from '../../../lib/csrfFetch';
import { useAIContext } from '../../../contexts/AIContext';

interface AIAnalyticsInsight {
  summary: string;
  trends: string[];
  risks: string[];
  opportunities: string[];
}

export function AnalyticsAIInsights() {
  const { settings } = useAIContext();
  const [salesSummary, setSalesSummary] = useState('W1: 1.2L\nW2: 1.5L\nW3: 1.1L\nW4: 1.8L');
  const [weakCategories, setWeakCategories] = useState('wall art, planters');
  const [insight, setInsight] = useState<AIAnalyticsInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!settings?.adminTools.analytics) {
    return null;
  }

  const requestInsights = async () => {
    setLoading(true);
    setError(null);
    setInsight(null);

    try {
      const payload = {
        salesSummary: salesSummary
          .split('\n')
          .map((line) => {
            const [label, value] = line.split(':');
            return { label: label?.trim() || 'Week', value: Number(value?.replace(/[^0-9.]/g, '')) || 0 };
          })
          .filter((item) => item.label),
        weakCategories: weakCategories
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      };

      const response = await csrfFetch<AIAnalyticsInsight>('/api/ai/admin/analytics', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Unable to fetch insights');
      }

      setInsight(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analytics helper unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Sales Insights</h3>
          <p className="text-sm text-gray-500">Paste metrics, get instant narrative insights + action items.</p>
        </div>
        <span className="text-2xl">📈</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Weekly revenue snapshot</label>
          <textarea
            value={salesSummary}
            onChange={(event) => setSalesSummary(event.target.value)}
            rows={4}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Weak categories (comma separated)</label>
          <input
            type="text"
            value={weakCategories}
            onChange={(event) => setWeakCategories(event.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={requestInsights}
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
        >
          {loading ? 'Analyzing…' : 'Generate insights'}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {insight && (
          <div className="mt-4 space-y-3">
            <section>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Summary</h4>
              <p className="text-sm text-gray-700 mt-1">{insight.summary}</p>
            </section>
            {insight.trends?.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Trends</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mt-1">
                  {insight.trends.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
            )}
            {insight.risks?.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Risks</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mt-1">
                  {insight.risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              </section>
            )}
            {insight.opportunities?.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Opportunities</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mt-1">
                  {insight.opportunities.map((opportunity) => (
                    <li key={opportunity}>{opportunity}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



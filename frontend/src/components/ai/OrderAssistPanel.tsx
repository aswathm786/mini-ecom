import { FormEvent, useState } from 'react';
import { useAIContext } from '../../contexts/AIContext';
import { csrfFetch } from '../../lib/csrfFetch';

interface OrderAssistResponse {
  answer: string;
  referencedOrders?: string[];
}

export function OrderAssistPanel() {
  const { settings } = useAIContext();
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<OrderAssistResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!settings?.enabled || !settings.orderAssist.enabled) {
    return null;
  }

  const askAI = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await csrfFetch<OrderAssistResponse>('/api/ai/order-assist', {
        method: 'POST',
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!result.ok || !result.data) {
        throw new Error(result.error || 'Unable to fetch order help');
      }

      setResponse(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to answer now');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Need help with this order?</h3>
      <p className="text-sm text-gray-600 mb-4">
        Harmony AI can check statuses, remind you of delivery windows, or guide returns (no personal
        data shared).
      </p>

      <form onSubmit={askAI} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g., Where is my package now?"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Ask'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {response && (
        <div className="mt-4 border border-primary-100 bg-primary-50 rounded-lg p-4 text-sm text-gray-800">
          <p>{response.answer}</p>
          {response.referencedOrders && response.referencedOrders.length > 0 && (
            <p className="text-xs text-gray-600 mt-2">
              Referenced orders:{' '}
              {response.referencedOrders.map((orderId) => `#${orderId.slice(-6)}`).join(', ')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}



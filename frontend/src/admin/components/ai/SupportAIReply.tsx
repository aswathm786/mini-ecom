import { useState } from 'react';
import { csrfFetch } from '../../../lib/csrfFetch';
import { useAIContext } from '../../../contexts/AIContext';

interface AISupportReply {
  suggestedReply: string;
  tone: string;
  tags: string[];
  nextSteps: string[];
}

export function SupportAIReply() {
  const { settings } = useAIContext();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<AISupportReply | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!settings?.adminTools.supportReplies) {
    return null;
  }

  const handleDraft = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Ticket subject and message are required');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await csrfFetch<AISupportReply>('/api/ai/admin/support-reply', {
        method: 'POST',
        body: JSON.stringify({
          ticket: {
            subject: subject.trim(),
            body,
          },
        }),
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Unable to draft reply');
      }

      setResult(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Support Reply</h3>
          <p className="text-sm text-gray-500">Give Harmony AI a ticket and get a soft, on-brand reply.</p>
        </div>
        <span className="text-2xl">💬</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Ticket subject</label>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            placeholder="Delayed shipment for order #4582"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Customer message</label>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            rows={4}
            placeholder="Describe the issue or paste the customer's email..."
          />
        </div>
        <button
          type="button"
          onClick={handleDraft}
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
        >
          {loading ? 'Drafting…' : 'Generate reply'}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="mt-4 space-y-3">
            <section>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Suggested reply</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{result.suggestedReply}</p>
            </section>
            <section className="grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div>
                <p className="font-medium text-gray-900">Tone</p>
                <p>{result.tone}</p>
              </div>
              {result.tags?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-900">Suggested tags</p>
                  <p>{result.tags.join(', ')}</p>
                </div>
              )}
            </section>
            {result.nextSteps?.length > 0 && (
              <section>
                <p className="text-xs font-medium text-gray-900 uppercase tracking-wide mb-1">Next steps</p>
                <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1">
                  {result.nextSteps.map((step) => (
                    <li key={step}>{step}</li>
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



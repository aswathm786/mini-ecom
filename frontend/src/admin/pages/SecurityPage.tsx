import { useEffect, useState } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { Button } from '../../components/Button';

interface WhitelistForm {
  enabled: boolean;
  ips: string;
}

export function SecurityPage() {
  const api = useAdminApi();
  const [form, setForm] = useState<WhitelistForm>({ enabled: false, ips: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ enabled: boolean; ips: string[] }>('/security/ip-whitelist');
      setForm({
        enabled: data.enabled,
        ips: data.ips?.join('\n') || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        enabled: form.enabled,
        ips: form.ips
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      };
      await api.put('/security/ip-whitelist', payload);
      setMessage('Whitelist updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update whitelist');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-600">Loading security settings…</div>;
    }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Security Center</h1>
        <p className="text-gray-600">Protect the admin surface with IP whitelisting and audit logging.</p>
      </header>

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 max-w-3xl">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Admin IP Whitelist</h2>
            <p className="text-sm text-gray-500">
              When enabled, only listed IP addresses may call `/admin` APIs. All other attempts are denied and logged.
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded"
              />
              Enable IP Whitelist
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed IPs (one per line)</label>
              <textarea
                rows={6}
                value={form.ips}
                onChange={(event) => setForm((prev) => ({ ...prev, ips: event.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                placeholder="203.0.113.7&#10;198.51.100.42"
              />
              <p className="text-xs text-gray-500 mt-1">Supports IPv4 or IPv6, maximum 50 entries.</p>
            </div>

            <Button type="submit" isLoading={saving}>
              Save Settings
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}



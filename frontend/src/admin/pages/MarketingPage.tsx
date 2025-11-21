import { useEffect, useState } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { Button } from '../../components/Button';

interface Banner {
  title: string;
  subtitle?: string;
  imageUrl: string;
  link?: string;
  ctaLabel?: string;
}

interface FlashDeal {
  name: string;
  discount: number;
  expiresAt: string;
  productIds: string[];
}

interface Announcement {
  message: string;
  level: 'info' | 'warning' | 'success';
  startAt?: string;
  endAt?: string;
}

interface MarketingConfig {
  banners: Banner[];
  flashDeals: FlashDeal[];
  announcements: Announcement[];
  newsletterSubject?: string;
  newsletterBody?: string;
}

export function MarketingPage() {
  const api = useAdminApi();
  const [config, setConfig] = useState<MarketingConfig>({
    banners: [],
    flashDeals: [],
    announcements: [],
    newsletterSubject: '',
    newsletterBody: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<MarketingConfig>('/marketing');
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketing settings');
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    setError(null);
    try {
      const defaults = await api.delete<MarketingConfig>('/marketing');
      setConfig(defaults);
      setMessage('Marketing settings restored to defaults');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset marketing settings');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.put('/marketing', config);
      setMessage('Marketing settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save marketing settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-600">Loading marketing studio…</div>;
  }

  const addBanner = () =>
    setConfig((prev) => ({
      ...prev,
      banners: [...prev.banners, { title: 'New Banner', imageUrl: 'https://placehold.co/1200x400' }],
    }));

  const addAnnouncement = () =>
    setConfig((prev) => ({
      ...prev,
      announcements: [...prev.announcements, { message: 'New announcement', level: 'info' }],
    }));

  const addDeal = () =>
    setConfig((prev) => ({
      ...prev,
      flashDeals: [
        ...prev.flashDeals,
        { name: 'Flash Deal', discount: 25, expiresAt: new Date().toISOString(), productIds: [] },
      ],
    }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketing Studio</h1>
          <p className="text-gray-600">Manage banners, flash deals, announcements, and newsletter content.</p>
        </div>
        <Button type="button" variant="outline" disabled={saving} onClick={reset}>
          Reset to defaults
        </Button>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Hero Banners</h2>
          <Button type="button" variant="outline" onClick={addBanner}>
            Add Banner
          </Button>
        </div>
        {config.banners.length === 0 ? (
          <p className="text-sm text-gray-500">No banners configured.</p>
        ) : (
          <div className="space-y-4">
            {config.banners.map((banner, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 grid gap-3 md:grid-cols-2">
                <input
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Title"
                  value={banner.title}
                  onChange={(e) =>
                    setConfig((prev) => {
                      const next = [...prev.banners];
                      next[index] = { ...next[index], title: e.target.value };
                      return { ...prev, banners: next };
                    })
                  }
                />
                <input
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Image URL"
                  value={banner.imageUrl}
                  onChange={(e) =>
                    setConfig((prev) => {
                      const next = [...prev.banners];
                      next[index] = { ...next[index], imageUrl: e.target.value };
                      return { ...prev, banners: next };
                    })
                  }
                />
                <input
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Subtitle"
                  value={banner.subtitle || ''}
                  onChange={(e) =>
                    setConfig((prev) => {
                      const next = [...prev.banners];
                      next[index] = { ...next[index], subtitle: e.target.value };
                      return { ...prev, banners: next };
                    })
                  }
                />
                <input
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="CTA Link (optional)"
                  value={banner.link || ''}
                  onChange={(e) =>
                    setConfig((prev) => {
                      const next = [...prev.banners];
                      next[index] = { ...next[index], link: e.target.value };
                      return { ...prev, banners: next };
                    })
                  }
                />
                <div className="md:col-span-2 flex justify-end">
                  <Button variant="ghost" type="button" onClick={() => removeBanner(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Flash Deals</h2>
          <Button type="button" variant="outline" onClick={addDeal}>
            Add Deal
          </Button>
        </div>
        {config.flashDeals.length === 0 ? (
          <p className="text-sm text-gray-500">No flash deals configured.</p>
        ) : (
          <div className="space-y-4">
            {config.flashDeals.map((deal, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 grid md:grid-cols-4 gap-3 text-sm">
                <input
                  className="border border-gray-300 rounded px-2 py-2"
                  placeholder="Name"
                  value={deal.name}
                  onChange={(e) =>
                    updateFlashDeal(idx, { ...deal, name: e.target.value })
                  }
                />
                <input
                  className="border border-gray-300 rounded px-2 py-2"
                  type="number"
                  placeholder="Discount %"
                  value={deal.discount}
                  onChange={(e) =>
                    updateFlashDeal(idx, { ...deal, discount: Number(e.target.value) })
                  }
                />
                <input
                  className="border border-gray-300 rounded px-2 py-2"
                  type="datetime-local"
                  value={deal.expiresAt.slice(0, 16)}
                  onChange={(e) =>
                    updateFlashDeal(idx, { ...deal, expiresAt: new Date(e.target.value).toISOString() })
                  }
                />
                <input
                  className="border border-gray-300 rounded px-2 py-2"
                  placeholder="Product IDs (comma separated)"
                  value={deal.productIds.join(',')}
                  onChange={(e) =>
                    updateFlashDeal(idx, { ...deal, productIds: e.target.value.split(',').map((id) => id.trim()) })
                  }
                />
                <div className="md:col-span-4 flex justify-end">
                  <Button variant="ghost" type="button" onClick={() => removeFlashDeal(idx)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Announcements</h2>
          <Button type="button" variant="outline" onClick={addAnnouncement}>
            Add Announcement
          </Button>
        </div>
        {config.announcements.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements configured.</p>
        ) : (
          <div className="space-y-4">
            {config.announcements.map((announcement, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 grid md:grid-cols-3 gap-3 text-sm">
                <textarea
                  className="border border-gray-300 rounded px-2 py-2 md:col-span-2"
                  placeholder="Message"
                  value={announcement.message}
                  onChange={(e) =>
                    updateAnnouncement(idx, { ...announcement, message: e.target.value })
                  }
                />
                <select
                  className="border border-gray-300 rounded px-2 py-2"
                  value={announcement.level}
                  onChange={(e) =>
                    updateAnnouncement(idx, { ...announcement, level: e.target.value as Announcement['level'] })
                  }
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                </select>
                <div className="md:col-span-3 flex justify-end">
                  <Button variant="ghost" type="button" onClick={() => removeAnnouncement(idx)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Newsletter Template</h2>
        <input
          className="border border-gray-300 rounded px-3 py-2 w-full"
          placeholder="Subject"
          value={config.newsletterSubject || ''}
          onChange={(e) => setConfig((prev) => ({ ...prev, newsletterSubject: e.target.value }))}
        />
        <textarea
          className="border border-gray-300 rounded px-3 py-2 w-full min-h-[160px]"
          placeholder="Newsletter body"
          value={config.newsletterBody || ''}
          onChange={(e) => setConfig((prev) => ({ ...prev, newsletterBody: e.target.value }))}
        />
      </section>

      <div className="flex justify-end">
        <Button type="button" isLoading={saving} onClick={save}>
          Save Marketing Settings
        </Button>
      </div>
    </div>
  );

  function updateFlashDeal(index: number, value: FlashDeal) {
    setConfig((prev) => {
      const next = [...prev.flashDeals];
      next[index] = value;
      return { ...prev, flashDeals: next };
    });
  }

  function updateAnnouncement(index: number, value: Announcement) {
    setConfig((prev) => {
      const next = [...prev.announcements];
      next[index] = value;
      return { ...prev, announcements: next };
    });
  }

  function removeBanner(index: number) {
    setConfig((prev) => ({
      ...prev,
      banners: prev.banners.filter((_, idx) => idx !== index),
    }));
  }

  function removeFlashDeal(index: number) {
    setConfig((prev) => ({
      ...prev,
      flashDeals: prev.flashDeals.filter((_, idx) => idx !== index),
    }));
  }

  function removeAnnouncement(index: number) {
    setConfig((prev) => ({
      ...prev,
      announcements: prev.announcements.filter((_, idx) => idx !== index),
    }));
  }
}



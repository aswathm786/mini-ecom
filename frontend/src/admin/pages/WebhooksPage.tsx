/**
 * Admin Webhooks Page
 * 
 * Webhook events viewer & replay.
 */

import { useState } from 'react';
import { useWebhooks } from '../hooks/useWebhooks';
import { DatasetTable } from '../components/DatasetTable';
import { FiltersBar } from '../components/FiltersBar';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

export function WebhooksPage() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { events, loading, error, total, page, pages, setPage, setFilters: setWebhooksFilters, retryEvent, refetch } = useWebhooks({
    page: 1,
    limit: 20,
  });
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setWebhooksFilters(newFilters);
    setPage(1);
  };

  const handleRetry = async (eventId: string) => {
    const success = await retryEvent(eventId);
    if (success) {
      addToast('Webhook event retried successfully', 'success');
    } else {
      addToast('Failed to retry webhook event', 'error');
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'processed', label: 'Processed' },
    { value: 'failed', label: 'Failed' },
  ];

  const columns = [
    {
      key: '_id',
      label: 'Event ID',
      render: (event: any) => <span className="font-mono text-sm">{event._id.slice(-8)}</span>,
    },
    {
      key: 'event_type',
      label: 'Event Type',
      render: (event: any) => <span className="font-medium">{event.event_type}</span>,
    },
    {
      key: 'source',
      label: 'Source',
      render: (event: any) => <span className="text-sm text-gray-600">{event.source}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (event: any) => {
        const statusColors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800',
          processed: 'bg-green-100 text-green-800',
          failed: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[event.status] || statusColors.pending}`}>
            {event.status}
          </span>
        );
      },
    },
    {
      key: 'attempts',
      label: 'Attempts',
      render: (event: any) => <span>{event.attempts}</span>,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (event: any) => (
        <span className="text-sm text-gray-600">
          {new Date(event.createdAt).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (event: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedEvent(event)}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            View
          </button>
          {event.status === 'failed' && (
            <button
              onClick={() => handleRetry(event._id)}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Retry
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Webhook Events</h1>

      <FiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        statusOptions={statusOptions}
        customFilters={[
          {
            key: 'eventType',
            label: 'Event Type',
            type: 'text',
          },
        ]}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <DatasetTable
        data={events}
        columns={columns}
        loading={loading}
        page={page}
        pages={pages}
        total={total}
        onPageChange={setPage}
        emptyMessage="No webhook events found"
      />

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setSelectedEvent(null)}>
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setSelectedEvent(null)}
            />
            <div
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Webhook Event Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Event Type</p>
                    <p className="text-sm text-gray-900">{selectedEvent.event_type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payload</p>
                    <pre className="mt-2 p-4 bg-gray-50 rounded-md text-xs overflow-auto max-h-96">
                      {JSON.stringify(selectedEvent.payload, null, 2)}
                    </pre>
                  </div>
                  {selectedEvent.last_error && (
                    <div>
                      <p className="text-sm font-medium text-red-500">Last Error</p>
                      <p className="text-sm text-red-700">{selectedEvent.last_error}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button variant="primary" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


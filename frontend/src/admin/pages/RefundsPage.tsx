/**
 * Admin Refunds Page
 * 
 * List and process refunds.
 */

import { useState } from 'react';
import { useRefunds } from '../hooks/useRefunds';
import { DatasetTable } from '../components/DatasetTable';
import { FiltersBar } from '../components/FiltersBar';
import { ConfirmAction } from '../components/ConfirmAction';
import { formatCurrency } from '../../lib/format';
import { Link } from 'react-router-dom';
import { ToastContainer } from '../../components/Toast';

export function RefundsPage() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const { refunds, loading, error, total, page, pages, setPage, setFilters: setRefundsFilters, processRefund, refetch } = useRefunds({
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
    setRefundsFilters(newFilters);
    setPage(1);
  };

  const handleProcessRefund = (refundId: string) => {
    setProcessingId(refundId);
    setShowConfirm(true);
  };

  const confirmProcessRefund = async () => {
    if (processingId) {
      const success = await processRefund(processingId);
      if (success) {
        addToast('Refund processed successfully', 'success');
      } else {
        addToast('Failed to process refund', 'error');
      }
      setProcessingId(null);
      setShowConfirm(false);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ];

  const columns = [
    {
      key: '_id',
      label: 'Refund ID',
      render: (refund: any) => <span className="font-mono text-sm">{refund._id.slice(-8)}</span>,
    },
    {
      key: 'orderId',
      label: 'Order',
      render: (refund: any) => (
        <Link to={`/admin/orders/${refund.orderId}`} className="text-primary-600 hover:text-primary-700">
          {refund.orderId.slice(-8)}
        </Link>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (refund: any) => formatCurrency(refund.amount),
    },
    {
      key: 'status',
      label: 'Status',
      render: (refund: any) => {
        const statusColors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800',
          processing: 'bg-blue-100 text-blue-800',
          completed: 'bg-green-100 text-green-800',
          failed: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[refund.status] || statusColors.pending}`}>
            {refund.status}
          </span>
        );
      },
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (refund: any) => <span className="text-sm text-gray-600">{refund.reason}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (refund: any) => (
        refund.status === 'pending' ? (
          <button
            onClick={() => handleProcessRefund(refund._id)}
            className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Process
          </button>
        ) : null
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Refunds</h1>

      <FiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        statusOptions={statusOptions}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <DatasetTable
        data={refunds}
        columns={columns}
        loading={loading}
        page={page}
        pages={pages}
        total={total}
        onPageChange={setPage}
        emptyMessage="No refunds found"
      />

      <ConfirmAction
        isOpen={showConfirm}
        title="Process Refund"
        message="Are you sure you want to process this refund? This will initiate the refund with the payment gateway."
        confirmText="Process Refund"
        onConfirm={confirmProcessRefund}
        onCancel={() => {
          setShowConfirm(false);
          setProcessingId(null);
        }}
        variant="warning"
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


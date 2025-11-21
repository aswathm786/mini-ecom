/**
 * Admin Orders Page
 * 
 * List orders with filters, search, and bulk actions.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrdersAdmin } from '../hooks/useOrdersAdmin';
import { DatasetTable } from '../components/DatasetTable';
import { FiltersBar } from '../components/FiltersBar';
import { formatCurrency } from '../../lib/format';

export function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialUserId = searchParams.get('userId') || '';
  const [filters, setFilters] = useState<Record<string, any>>(
    initialUserId ? { userId: initialUserId } : {}
  );
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const {
    orders,
    loading,
    error,
    total,
    page,
    pages,
    setPage,
    setFilters: setOrdersFilters,
  } = useOrdersAdmin({
    page: 1,
    limit: 20,
    userId: initialUserId || undefined,
  });

  useEffect(() => {
    if (initialUserId) {
      setOrdersFilters((prev) => ({ ...prev, userId: initialUserId }));
    }
  }, [initialUserId, setOrdersFilters]);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setOrdersFilters(newFilters);
    setPage(1);
  };

  const handleReset = () => {
    setFilters({});
    setOrdersFilters({});
    setPage(1);
  };

  const handleDownloadInvoice = async (orderId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDownloadingInvoice(orderId);
    
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to download invoice');
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      alert('Failed to download invoice. Please try again.');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
  ];

  const columns = [
    {
      key: '_id',
      label: 'Order ID',
      render: (order: any) => (
        <span className="font-mono text-sm">{order._id.slice(-8)}</span>
      ),
    },
    {
      key: 'placedAt',
      label: 'Date',
      render: (order: any) => (
        <span>{new Date(order.placedAt).toLocaleDateString('en-IN')}</span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (order: any) => formatCurrency(order.amount),
    },
    {
      key: 'status',
      label: 'Status',
      render: (order: any) => {
        const statusColors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800',
          paid: 'bg-blue-100 text-blue-800',
          processing: 'bg-purple-100 text-purple-800',
          shipped: 'bg-indigo-100 text-indigo-800',
          delivered: 'bg-green-100 text-green-800',
          cancelled: 'bg-red-100 text-red-800',
          refunded: 'bg-gray-100 text-gray-800',
        };
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[order.status] || statusColors.pending}`}>
            {order.status}
          </span>
        );
      },
    },
    {
      key: 'payment',
      label: 'Payment',
      render: (order: any) => (
        <span className="text-sm text-gray-600">
          {order.payment?.status || 'N/A'} ({order.payment?.gateway || 'N/A'})
        </span>
      ),
    },
    {
      key: 'invoice',
      label: 'Invoice',
      render: (order: any) => (
        <button
          onClick={(e) => handleDownloadInvoice(order._id, e)}
          disabled={downloadingInvoice === order._id}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloadingInvoice === order._id ? 'Downloading...' : 'Download PDF'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
      </div>

      <FiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        searchPlaceholder="Search by order ID..."
        statusOptions={statusOptions}
        customFilters={[
          {
            key: 'fromDate',
            label: 'From Date',
            type: 'date',
          },
          {
            key: 'toDate',
            label: 'To Date',
            type: 'date',
          },
          {
            key: 'userId',
            label: 'User ID',
            type: 'text',
            placeholder: 'Filter by user ID…',
          },
        ]}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <DatasetTable
        data={orders}
        columns={columns}
        loading={loading}
        page={page}
        pages={pages}
        total={total}
        onPageChange={setPage}
        onRowClick={(order) => navigate(`/admin/orders/${order._id}`)}
        emptyMessage="No orders found"
      />
    </div>
  );
}


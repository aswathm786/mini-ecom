/**
 * Admin Orders Page
 * 
 * List orders with filters, search, and bulk actions.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrdersAdmin } from '../hooks/useOrdersAdmin';
import { DatasetTable } from '../components/DatasetTable';
import { FiltersBar } from '../components/FiltersBar';
import { formatCurrency } from '../../lib/format';

export function OrdersPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, any>>({});
  const { orders, loading, error, total, page, pages, setPage, setFilters: setOrdersFilters, refetch } = useOrdersAdmin({
    page: 1,
    limit: 20,
  });

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


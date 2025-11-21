/**
 * Admin Support Tickets Page
 * 
 * List and manage support tickets. Admins can view all tickets,
 * reply to tickets, change status, and assign tickets.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminApi } from '../hooks/useAdminApi';
import { DatasetTable } from '../components/DatasetTable';
import { FiltersBar } from '../components/FiltersBar';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

interface Ticket {
  _id: string;
  userId: string;
  userEmail?: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  lastReplyAt?: string;
  replyCount: number;
}

export function SupportTicketsPage() {
  const api = useAdminApi();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
    setTimeout(() => removeToast(toastId), 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    loadTickets();
  }, [page, filters]);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams: Record<string, any> = {
        page: page.toString(),
        limit: '20',
      };

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          queryParams[key] = value;
        }
      });

      // Backend returns: { ok: true, data: { items, total, pages } }
      // api.get extracts response.data which is { items, total, pages }
      const response = await api.get<any>('/support/tickets', queryParams);
      
      // Handle response structure - api.get returns response.data from csrfFetch
      // which is { items, total, pages } from backend's data field
      console.log('Tickets response:', response);
      
      if (response && typeof response === 'object') {
        // Check if response has items directly or nested in data
        const items = response.items || (response.data && response.data.items) || [];
        const total = response.total || (response.data && response.data.total) || 0;
        const pages = response.pages || (response.data && response.data.pages) || 1;
        
        setTickets(items);
        setTotal(total);
        setPages(pages);
      } else {
        setTickets([]);
        setTotal(0);
        setPages(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tickets';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await api.post(`/support/tickets/${ticketId}/status`, { status: newStatus });
      addToast('Ticket status updated', 'success');
      loadTickets();
    } catch (err) {
      addToast('Failed to update ticket status', 'error');
    }
  };

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const columns = [
    {
      key: '_id',
      label: 'Ticket ID',
      render: (ticket: Ticket) => (
        <Link to={`/admin/support/tickets/${ticket._id}`} className="text-primary-600 hover:underline font-mono text-sm">
          {ticket._id.substring(0, 8)}...
        </Link>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (ticket: Ticket) => (
        <Link to={`/admin/support/tickets/${ticket._id}`} className="text-gray-900 hover:text-primary-600">
          {ticket.subject}
        </Link>
      ),
    },
    {
      key: 'userEmail',
      label: 'User',
      render: (ticket: Ticket) => ticket.userEmail || 'N/A',
    },
    {
      key: 'status',
      label: 'Status',
      render: (ticket: Ticket) => {
        const statusColors: Record<string, string> = {
          open: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          resolved: 'bg-blue-100 text-blue-800',
          closed: 'bg-gray-100 text-gray-800',
        };
        return (
          <select
            value={ticket.status}
            onChange={(e) => handleStatusChange(ticket._id, e.target.value)}
            className={`px-2 py-1 rounded text-xs font-medium ${statusColors[ticket.status] || 'bg-gray-100 text-gray-800'} border-0 cursor-pointer`}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (ticket: Ticket) => {
        const priorityColors: Record<string, string> = {
          low: 'bg-gray-100 text-gray-800',
          medium: 'bg-blue-100 text-blue-800',
          high: 'bg-orange-100 text-orange-800',
          urgent: 'bg-red-100 text-red-800',
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[ticket.priority] || 'bg-gray-100 text-gray-800'}`}>
            {ticket.priority}
          </span>
        );
      },
    },
    {
      key: 'replyCount',
      label: 'Replies',
      render: (ticket: Ticket) => ticket.replyCount || 0,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (ticket: Ticket) => new Date(ticket.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (ticket: Ticket) => (
        <Link
          to={`/admin/support/tickets/${ticket._id}`}
          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
      </div>

      <FiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={() => {
          setFilters({});
          setPage(1);
        }}
        searchPlaceholder="Search by subject or user email..."
        statusOptions={statusOptions}
        customFilters={[
          {
            key: 'priority',
            label: 'Priority',
            type: 'select',
            options: priorityOptions,
          },
        ]}
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <DatasetTable
        data={tickets}
        columns={columns}
        loading={loading}
        page={page}
        pages={pages}
        total={total}
        onPageChange={setPage}
        emptyMessage="No support tickets found"
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


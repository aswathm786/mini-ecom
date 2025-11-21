/**
 * Admin Support Ticket Details Page
 * 
 * View ticket thread, reply to tickets, and manage ticket status.
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

interface TicketReply {
  _id: string;
  userId: string;
  userEmail?: string;
  message: string;
  attachments?: string[];
  isAdmin: boolean;
  createdAt: string;
}

interface Ticket {
  _id: string;
  userId: string;
  userEmail?: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}

export function SupportTicketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useAdminApi();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);
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
    if (id) {
      loadTicket();
    }
  }, [id]);

  const loadTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      // api.get returns response.data from csrfFetch
      // Backend returns: { ok: true, data: Ticket }
      // csrfFetch returns: { ok: true, data: { ok: true, data: Ticket } }
      // api.get extracts: { ok: true, data: Ticket }
      const response = await api.get<any>(`/support/tickets/${id}`);
      
      console.log('Ticket response:', response);
      
      // Handle different response structures
      if (response && typeof response === 'object') {
        // Check if response has nested data structure { ok: true, data: Ticket }
        if (response.ok && response.data) {
          setTicket(response.data);
        } else if (response._id || response.subject) {
          // Response is the ticket directly (no wrapper)
          setTicket(response as Ticket);
        } else if (response.data && (response.data._id || response.data.subject)) {
          // Response has data property with ticket
          setTicket(response.data as Ticket);
        } else {
          setError(response.error || 'Ticket not found');
        }
      } else {
        setError('Ticket not found');
      }
    } catch (err: any) {
      // api.get throws AdminApiError if response.ok is false
      // Extract error message from the error response
      const errorMessage = err?.response?.error || err?.message || 'Failed to load ticket';
      setError(errorMessage);
      console.error('Error loading ticket:', err);
      console.error('Error response:', err?.response);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !id) return;

    setReplying(true);
    try {
      const response = await api.post(`/support/tickets/${id}/reply`, {
        message: replyMessage,
      });

      if (response.ok) {
        addToast('Reply sent successfully', 'success');
        setReplyMessage('');
        loadTicket();
      } else {
        addToast('Failed to send reply', 'error');
      }
    } catch (err) {
      addToast('Failed to send reply', 'error');
    } finally {
      setReplying(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;

    try {
      const response = await api.post(`/support/tickets/${id}/status`, { status: newStatus });
      if (response.ok) {
        addToast('Ticket status updated', 'success');
        loadTicket();
      } else {
        addToast('Failed to update status', 'error');
      }
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error || 'Ticket not found'}
        </div>
        <Button variant="secondary" onClick={() => navigate('/admin/support/tickets')}>
          Back to Tickets
        </Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    open: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-blue-100 text-blue-800',
    closed: 'bg-gray-100 text-gray-800',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/support/tickets" className="text-primary-600 hover:text-primary-800 text-sm mb-2 inline-block">
            ← Back to Tickets
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`px-3 py-2 rounded text-sm font-medium ${statusColors[ticket.status]} border-0`}
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <span className={`px-3 py-2 rounded text-sm font-medium ${priorityColors[ticket.priority]}`}>
            {ticket.priority}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-600">From: {ticket.userEmail || 'N/A'}</p>
              <p className="text-sm text-gray-600">Created: {new Date(ticket.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {ticket.replies && ticket.replies.length > 0 ? (
            ticket.replies.map((reply) => (
              <div
                key={reply._id}
                className={`p-4 rounded-lg ${
                  reply.isAdmin ? 'bg-primary-50 border-l-4 border-primary-500' : 'bg-gray-50 border-l-4 border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {reply.isAdmin ? 'Admin' : reply.userEmail || 'User'}
                    </p>
                    <p className="text-sm text-gray-600">{new Date(reply.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                {reply.attachments && reply.attachments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Attachments:</p>
                    <ul className="list-disc list-inside">
                      {reply.attachments.map((att, idx) => (
                        <li key={idx} className="text-sm text-primary-600">
                          <a href={`/api/uploads/${att}`} target="_blank" rel="noopener noreferrer">
                            {att}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-600">No replies yet.</p>
          )}
        </div>

        <form onSubmit={handleReply} className="mt-6 pt-6 border-t border-gray-200">
          <div className="space-y-4">
            <div>
              <label htmlFor="reply" className="block text-sm font-medium text-gray-700 mb-2">
                Reply to Ticket
              </label>
              <textarea
                id="reply"
                rows={6}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Type your reply here..."
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={replying || !replyMessage.trim()}>
                {replying ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


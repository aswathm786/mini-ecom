/**
 * Ticket Details Page
 * 
 * View ticket thread and reply to tickets.
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTickets } from '../../hooks/useTickets';
import { Button } from '../../components/Button';
import { uploadFile } from '../../lib/fileUpload';

export function TicketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { getTicket, replyToTicket, closeTicket } = useTickets();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicket();
    }
  }, [id]);

  const loadTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      const ticketData = await getTicket(id!);
      if (ticketData) {
        setTicket(ticketData);
      } else {
        setError('Ticket not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !id) return;

    setReplying(true);
    try {
      // Upload attachments
      const uploadIds: string[] = [];
      for (const file of attachments) {
        try {
          const result = await uploadFile(file);
          uploadIds.push(result.uploadId);
        } catch (err) {
          console.error('Error uploading file:', err);
        }
      }

      await replyToTicket(id, replyMessage, uploadIds.length > 0 ? uploadIds : undefined);
      setReplyMessage('');
      setAttachments([]);
      await loadTicket();
    } catch (error) {
      console.error('Error replying to ticket:', error);
    } finally {
      setReplying(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to close this ticket?')) return;

    try {
      await closeTicket(id);
      await loadTicket();
    } catch (error) {
      console.error('Error closing ticket:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error || 'Ticket not found'}</p>
          <Link to="/account/tickets" className="mt-4 inline-block text-primary-600 hover:underline">
            ← Back to Tickets
          </Link>
        </div>
      </div>
    );
  }

  const statusColors = {
    open: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-gray-100 text-gray-800',
    closed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/account/tickets" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Tickets
      </Link>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
            {ticket.orderId && (
              <p className="text-sm text-gray-600 mt-1">Related to Order: {ticket.orderId.slice(-8)}</p>
            )}
          </div>
          <span
            className={`px-3 py-1 text-sm font-medium rounded ${
              statusColors[ticket.status] || statusColors.open
            }`}
          >
            {ticket.status.replace('_', ' ')}
          </span>
        </div>

        {ticket.status !== 'closed' && (
          <Button variant="outline" onClick={handleClose} className="text-red-600 hover:text-red-700">
            Close Ticket
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {ticket.messages && ticket.messages.length > 0 ? (
          ticket.messages.map((message: any, index: number) => (
            <div
              key={message._id || index}
              className={`bg-white rounded-lg shadow-md p-4 ${
                message.isAgent ? 'border-l-4 border-primary-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {message.isAgent ? 'Support Agent' : 'You'}
                  </span>
                  {message.isAgent && (
                    <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                      Support
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(message.createdAt).toLocaleString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.attachments.map((att: any, attIndex: number) => (
                    <a
                      key={attIndex}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      📎 {att.filename}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-600 text-center py-8">No messages yet.</p>
        )}
      </div>

      {/* Reply Form */}
      {ticket.status !== 'closed' && (
        <form onSubmit={handleReply} className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reply</h2>
          <div className="space-y-4">
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={6}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Type your message here..."
            />
            <div>
              <label htmlFor="ticket-attachments" className="block text-sm font-medium text-gray-700 mb-1">
                Attachments (optional)
              </label>
              <input
                id="ticket-attachments"
                type="file"
                multiple
                onChange={handleFileSelect}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                accept="image/*,.pdf"
              />
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm text-gray-600">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" variant="primary" isLoading={replying}>
              Send Reply
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}


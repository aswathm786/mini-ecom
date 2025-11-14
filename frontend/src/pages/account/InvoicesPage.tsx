/**
 * Invoices Page
 * 
 * List and download invoices.
 */

import { useState, useEffect } from 'react';
import { csrfFetch } from '../../lib/csrfFetch';
import { InvoiceRow } from '../../components/account/InvoiceRow';
import { Button } from '../../components/Button';

interface Invoice {
  _id: string;
  orderId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  createdAt: string;
  pdfUrl?: string;
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Implement /api/invoices endpoint on backend
      // For now, fetch from orders and extract invoices
      const response = await csrfFetch('/api/orders?limit=100');
      if (response.ok && response.data) {
        const orders = Array.isArray(response.data) ? response.data : response.data.items || [];
        // Filter orders that have invoices (this is a placeholder - backend should provide /api/invoices)
        const invoicesList: Invoice[] = [];
        // TODO: Replace with actual /api/invoices endpoint
        setInvoices(invoicesList);
      } else {
        setError(response.error || 'Failed to fetch invoices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (invoiceId: string) => {
    try {
      // Find invoice to get orderId
      const invoice = invoices.find((inv) => inv._id === invoiceId);
      if (!invoice) return;

      const response = await fetch(`/api/orders/${invoice.orderId}/invoice`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${invoice.invoiceNumber}.pdf`;
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
    }
  };

  const handleRegenerate = async (orderId: string) => {
    try {
      const response = await csrfFetch(`/api/admin/orders/${orderId}/generate-invoice`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadInvoices();
        // TODO: Show success toast
      } else {
        throw new Error(response.error || 'Failed to regenerate invoice');
      }
    } catch (err) {
      console.error('Error regenerating invoice:', err);
      alert('Failed to regenerate invoice. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Invoices</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-600">No invoices found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <InvoiceRow key={invoice._id} invoice={invoice} onDownload={handleDownload} />
          ))}
        </div>
      )}
    </div>
  );
}


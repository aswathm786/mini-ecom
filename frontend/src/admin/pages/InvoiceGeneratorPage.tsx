/**
 * Admin Invoice Generator Page
 * 
 * Manual invoice generation for an order.
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

export function InvoiceGeneratorPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const api = useAdminApi();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>(`/orders/${orderId}`);
      setOrder(data.order || data);
    } catch (err) {
      addToast('Failed to load order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setGenerating(true);
    try {
      await api.post(`/orders/${orderId}/generate-invoice`);
      addToast('Invoice generated successfully', 'success');
    } catch (err) {
      addToast('Failed to generate invoice', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/invoice`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        addToast('Invoice downloaded successfully', 'success');
      } else {
        throw new Error('Failed to download invoice');
      }
    } catch (err) {
      addToast('Failed to download invoice', 'error');
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

  if (!order) {
    return (
      <div>
        <Link to="/admin/orders" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Orders
        </Link>
        <p className="text-gray-600">Order not found</p>
      </div>
    );
  }

  return (
    <div>
      <Link to={`/admin/orders/${orderId}`} className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Order
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Invoice Generator</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Order ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{order._id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Amount</dt>
            <dd className="mt-1 text-sm text-gray-900">₹{order.amount}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Actions</h2>
        <div className="flex gap-4">
          <Button
            variant="primary"
            onClick={handleGenerateInvoice}
            isLoading={generating}
          >
            Generate Invoice
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadInvoice}
          >
            Download Invoice
          </Button>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


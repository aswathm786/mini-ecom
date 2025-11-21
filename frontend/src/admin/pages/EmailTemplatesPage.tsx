/**
 * Admin Email Templates Page
 * 
 * Full CRUD for email templates.
 */

import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { DatasetTable } from '../components/DatasetTable';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

interface EmailTemplate {
  _id: string;
  name: string;
  eventType: string;
  subject: string;
  body: string;
  isProtected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EMAIL_EVENT_TYPES = [
  'USER_REGISTERED',
  'USER_LOGIN_ALERT',
  'PASSWORD_RESET',
  'EMAIL_VERIFICATION',
  'OTP_LOGIN',
  'ORDER_PLACED',
  'ORDER_PAID',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED',
  'PASSWORD_CHANGED',
  'PROMOTION',
  'SECURITY_ALERT',
];

export function EmailTemplatesPage() {
  const api = useAdminApi();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    eventType: '',
    subject: '',
    body: '',
    isProtected: false,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      // API returns { ok: true, data: EmailTemplate[] }
      // useAdminApi.get() extracts response.data, so we get { ok: true, data: [...] }
      const response = await api.get<any>('/email-templates');
      
      // Handle different response formats
      let templates: EmailTemplate[] = [];
      if (Array.isArray(response)) {
        templates = response;
      } else if (response?.data && Array.isArray(response.data)) {
        templates = response.data;
      } else {
        templates = [];
      }
      
      setTemplates(templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email templates');
      addToast('Failed to load email templates', 'error');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      eventType: '',
      subject: '',
      body: '',
      isProtected: false,
    });
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setFormData({
      name: template.name,
      eventType: template.eventType,
      subject: template.subject,
      body: template.body,
      isProtected: template.isProtected,
    });
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (template.isProtected) {
      addToast('Cannot delete protected template', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/email-templates/${template._id}`);
      addToast('Template deleted successfully', 'success');
      await loadTemplates();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete template', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.eventType || !formData.subject.trim() || !formData.body.trim()) {
      addToast('All fields are required', 'error');
      return;
    }

    try {
      if (editingTemplate) {
        await api.put(`/email-templates/${editingTemplate._id}`, formData);
        addToast('Template updated successfully', 'success');
      } else {
        await api.post('/email-templates', formData);
        addToast('Template created successfully', 'success');
      }

      setShowCreateModal(false);
      setEditingTemplate(null);
      await loadTemplates();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save template', 'error');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (template: EmailTemplate) => (
        <div>
          <p className="font-medium text-gray-900">{template.name}</p>
          <p className="text-sm text-gray-500">{template.eventType}</p>
        </div>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (template: EmailTemplate) => (
        <p className="text-sm text-gray-600 truncate max-w-xs">{template.subject}</p>
      ),
    },
    {
      key: 'isProtected',
      label: 'Protected',
      render: (template: EmailTemplate) => (
        <span className={`px-2 py-1 text-xs font-medium rounded ${
          template.isProtected ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {template.isProtected ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (template: EmailTemplate) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(template)}
          >
            Edit
          </Button>
          {!template.isProtected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(template)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage email templates with placeholders like {'{{name}}'}, {'{{reset_link}}'}, etc.
          </p>
        </div>
        <Button onClick={handleCreate}>Create Template</Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <DatasetTable
        data={templates}
        columns={columns}
        loading={loading}
        emptyMessage="No email templates found. Create your first template to get started."
      />

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Password Reset"
                  />
                </div>

                <div>
                  <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type / Key *
                  </label>
                  {editingTemplate ? (
                    <input
                      id="eventType"
                      type="text"
                      value={formData.eventType}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  ) : (
                    <select
                      id="eventType"
                      required
                      value={formData.eventType}
                      onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select event type...</option>
                      {EMAIL_EVENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  id="subject"
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Reset your password - {{siteName}}"
                />
                <p className="mt-1 text-xs text-gray-500">Use placeholders like {'{{name}}'}, {'{{reset_link}}'}, {'{{siteName}}'}</p>
              </div>

              <div>
                <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
                  HTML Body *
                </label>
                <textarea
                  id="body"
                  rows={12}
                  required
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="<h2>Hello {{name}}</h2><p>Click here to reset: <a href='{{reset_link}}'>Reset Password</a></p>"
                />
                <p className="mt-1 text-xs text-gray-500">Use HTML and placeholders like {'{{name}}'}, {'{{reset_link}}'}, {'{{orderId}}'}, etc.</p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isProtected}
                    onChange={(e) => setFormData({ ...formData, isProtected: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Protected (cannot be disabled by user preferences)</span>
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" variant="primary">
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTemplate(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


/**
 * Admin Countries Page
 * 
 * Manage countries for the platform.
 */

import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';
import { ConfirmAction } from '../components/ConfirmAction';

interface Country {
  _id: string;
  name: string;
  code: string;
  isDefault: boolean;
  enabled: boolean;
}

export function CountriesPage() {
  const api = useAdminApi();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    isDefault: false,
    enabled: true,
  });
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCountryId, setDeletingCountryId] = useState<string | null>(null);

  useEffect(() => {
    loadCountries();
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadCountries = async () => {
    setLoading(true);
    try {
      const data = await api.get<Country[]>('/countries');
      setCountries(data);
    } catch (error) {
      addToast('Failed to load countries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCountry(null);
    setFormData({
      name: '',
      code: '',
      isDefault: false,
      enabled: true,
    });
    setShowForm(true);
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      name: country.name,
      code: country.code,
      isDefault: country.isDefault,
      enabled: country.enabled,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editingCountry) {
        await api.put(`/countries/${editingCountry._id}`, formData);
        addToast('Country updated successfully', 'success');
      } else {
        await api.post('/countries', formData);
        addToast('Country created successfully', 'success');
      }
      setShowForm(false);
      await loadCountries();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save country', 'error');
    }
  };

  const handleDelete = (countryId: string) => {
    setDeletingCountryId(countryId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingCountryId) return;
    
    try {
      await api.delete(`/countries/${deletingCountryId}`);
      addToast('Country deleted successfully', 'success');
      await loadCountries();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to delete country', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setDeletingCountryId(null);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Countries</h1>
        <Button variant="primary" onClick={handleCreate}>
          Add Country
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {editingCountry ? 'Edit Country' : 'Add New Country'}
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="country-name" className="block text-sm font-medium text-gray-700 mb-1">
                Country Name *
              </label>
              <input
                id="country-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., United States"
              />
            </div>
            <div>
              <label htmlFor="country-code" className="block text-sm font-medium text-gray-700 mb-1">
                Country Code (ISO 2-letter) *
              </label>
              <input
                id="country-code"
                type="text"
                required
                maxLength={2}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., US"
              />
              <p className="mt-1 text-xs text-gray-500">2-letter ISO country code (e.g., US, GB, IN)</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Set as default country</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enabled</span>
              </label>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleSave}>
                {editingCountry ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Default
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {countries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No countries found. Add your first country to get started.
                </td>
              </tr>
            ) : (
              countries.map((country) => (
                <tr key={country._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {country.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {country.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      country.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {country.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {country.isDefault && (
                      <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(country)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(country._id)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmAction
        isOpen={showDeleteConfirm}
        title="Delete Country"
        message="Are you sure you want to delete this country? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingCountryId(null);
        }}
        variant="danger"
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


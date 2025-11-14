/**
 * Admin Product Edit Page
 * 
 * Full product edit form (images, inventory).
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { ProductImageUploader } from '../components/ProductImageUploader';
import { Button } from '../../components/Button';
import { formatCurrency } from '../../lib/format';
import { ToastContainer } from '../../components/Toast';

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toastId = Date.now().toString();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadProduct = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>(`/products/${id}`);
      setProduct(data);
    } catch (err) {
      addToast('Failed to load product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setSaving(true);
    try {
      await api.put(`/products/${id}`, product);
      addToast('Product updated successfully', 'success');
    } catch (err) {
      addToast('Failed to update product', 'error');
    } finally {
      setSaving(false);
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

  if (!product) {
    return (
      <div>
        <Link to="/admin/catalog" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Catalog
        </Link>
        <p className="text-gray-600">Product not found</p>
      </div>
    );
  }

  return (
    <div>
      <Link to="/admin/catalog" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Catalog
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Product</h1>

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Product Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={product.name || ''}
            onChange={(e) => setProduct({ ...product, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            rows={6}
            value={product.description || ''}
            onChange={(e) => setProduct({ ...product, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price *
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              required
              value={product.price || ''}
              onChange={(e) => setProduct({ ...product, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
              Stock *
            </label>
            <input
              id="stock"
              type="number"
              required
              value={product.stock || ''}
              onChange={(e) => setProduct({ ...product, stock: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
            SKU
          </label>
          <input
            id="sku"
            type="text"
            value={product.sku || ''}
            onChange={(e) => setProduct({ ...product, sku: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <ProductImageUploader
            images={product.images || []}
            onImagesChange={(images) => setProduct({ ...product, images })}
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={product.status || 'active'}
            onChange={(e) => setProduct({ ...product, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex gap-4">
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Changes
          </Button>
          <Link to="/admin/catalog">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


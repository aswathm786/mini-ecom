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
import { ProductDescriptionAIGenerator } from '../components/ai/ProductDescriptionAIGenerator';
import { ProductFAQAIGenerator } from '../components/ai/ProductFAQAIGenerator';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const api = useAdminApi();
  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  useEffect(() => {
    if (id) {
      loadProduct();
      loadCategories();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const response = await api.get<any>('/categories');
      // Handle both { data: [...] } and direct array responses
      const categoriesList = Array.isArray(response) ? response : (response.data || []);
      setCategories(categoriesList);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

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
      // Ensure categoryIds is set (migrate from categoryId if needed)
      if (!data.categoryIds && data.categoryId) {
        data.categoryIds = [data.categoryId];
      }
      // Ensure FAQ is initialized as an array
      if (!data.faq) {
        data.faq = [];
      }
      setProduct(data);
    } catch (err) {
      addToast('Failed to load product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      const currentImages = product.images || [];
      const newImage = {
        filename: imageUrlInput.trim(),
        url: imageUrlInput.trim(),
        alt: product.name || 'Product image',
      };
      setProduct({
        ...product,
        images: [...currentImages, newImage],
      });
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    const currentImages = product.images || [];
    setProduct({
      ...product,
      images: currentImages.filter((_: any, i: number) => i !== index),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setSaving(true);
    try {
      // Prepare data for API
      const updateData: any = {
        name: product.name,
        description: product.description,
        price: product.price,
        sku: product.sku,
        status: product.status,
        qty: product.stock,
        lowStockThreshold: product.lowStockThreshold || 10,
        faq: product.faq || [],
      };

      // Handle categories - use categoryIds if available, otherwise categoryId
      if (product.categoryIds && product.categoryIds.length > 0) {
        updateData.categoryIds = product.categoryIds;
      } else if (product.categoryId) {
        updateData.categoryIds = [product.categoryId];
      }

      // Extract image URLs from images array
      const imageUrls = (product.images || [])
        .filter((img: any) => img.url && !img.url.startsWith('/uploads/'))
        .map((img: any) => img.url);
      
      if (imageUrls.length > 0) {
        updateData.imageUrls = imageUrls;
      }

      await api.put(`/products/${id}`, updateData);
      addToast('Product updated successfully', 'success');
      await loadProduct(); // Reload to get updated data
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update product', 'error');
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
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
          </div>
          <textarea
            id="description"
            rows={6}
            value={product.description || ''}
            onChange={(e) => setProduct({ ...product, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <ProductDescriptionAIGenerator
            productName={product.name || ''}
            currentDescription={product.description || ''}
            onDescriptionGenerated={(description) => setProduct({ ...product, description })}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Images
          </label>
          
          {/* Image URLs */}
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                placeholder="Enter image URL"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImageUrl();
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button type="button" onClick={handleAddImageUrl} variant="outline">
                Add URL
              </Button>
            </div>
          </div>

          {/* Image Preview */}
          {product.images && product.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {product.images.map((img: any, index: number) => (
                <div key={index} className="relative group">
                  <img
                    src={img.url || img}
                    alt={img.alt || `Product ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* File Upload */}
          <ProductImageUploader
            images={(product.images || []).map((img: any) => img.url || img)}
            onImagesChange={(urls) => {
              const newImages = urls.map((url: string) => ({
                filename: url,
                url: url,
                alt: product.name || 'Product image',
              }));
              setProduct({ ...product, images: newImages });
            }}
          />
        </div>

        <div>
          <label htmlFor="categories" className="block text-sm font-medium text-gray-700 mb-1">
            Categories {categories.length > 0 && `(${categories.length} available)`}
          </label>
          {categories.length > 0 ? (
            <>
              <select
                id="categories"
                multiple
                value={product.categoryIds || (product.categoryId ? [product.categoryId] : [])}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setProduct({ ...product, categoryIds: selected });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-32"
                size={5}
              >
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd to select multiple categories</p>
            </>
          ) : (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
              No categories available. Create categories first in the Categories section.
            </div>
          )}
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

        {/* FAQ Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Frequently Asked Questions (FAQ)
          </label>
          <ProductFAQAIGenerator
            productName={product.name || ''}
            productDescription={product.description || ''}
            currentFAQ={product.faq || []}
            onFAQGenerated={(faqs) => setProduct({ ...product, faq: faqs })}
          />
          <div className="space-y-3">
            {(product.faq || []).map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-4">
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Question {index + 1}
                  </label>
                  <input
                    type="text"
                    value={item.question || ''}
                    onChange={(e) => {
                      const updatedFAQ = [...(product.faq || [])];
                      updatedFAQ[index] = { ...updatedFAQ[index], question: e.target.value };
                      setProduct({ ...product, faq: updatedFAQ });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="Enter question"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Answer {index + 1}
                  </label>
                  <textarea
                    value={item.answer || ''}
                    onChange={(e) => {
                      const updatedFAQ = [...(product.faq || [])];
                      updatedFAQ[index] = { ...updatedFAQ[index], answer: e.target.value };
                      setProduct({ ...product, faq: updatedFAQ });
                    }}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="Enter answer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updatedFAQ = (product.faq || []).filter((_, i) => i !== index);
                    setProduct({ ...product, faq: updatedFAQ });
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const updatedFAQ = [...(product.faq || []), { question: '', answer: '' }];
                setProduct({ ...product, faq: updatedFAQ });
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Add FAQ
            </button>
          </div>
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


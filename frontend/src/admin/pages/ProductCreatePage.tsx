/**
 * Admin Product Create Page
 * 
 * Create new product with full form (images, categories, inventory).
 */

import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';
import { ProductDescriptionAIGenerator } from '../components/ai/ProductDescriptionAIGenerator';
import { ProductFAQAIGenerator } from '../components/ai/ProductFAQAIGenerator';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

export function ProductCreatePage() {
  const navigate = useNavigate();
  const api = useAdminApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    sku: '',
    categoryIds: [] as string[],
    status: 'active' as 'active' | 'inactive' | 'draft',
    stock: 0,
    lowStockThreshold: 10,
    imageUrls: [] as string[],
    imageUrlInput: '',
    faq: [] as Array<{ question: string; answer: string }>,
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadCategories = async () => {
    try {
      const response = await api.get<any>('/categories');
      // Handle both { data: [...] } and direct array responses
      const categoriesList = Array.isArray(response) ? response : (response.data || []);
      setCategories(categoriesList);
    } catch (err) {
      console.error('Failed to load categories:', err);
      addToast('Failed to load categories', 'error');
    }
  };

  const handleAddImageUrl = () => {
    if (formData.imageUrlInput.trim() && !formData.imageUrls.includes(formData.imageUrlInput.trim())) {
      setFormData({
        ...formData,
        imageUrls: [...formData.imageUrls, formData.imageUrlInput.trim()],
        imageUrlInput: '',
      });
    }
  };

  const handleRemoveImageUrl = (index: number) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter((_, i) => i !== index),
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast('Product name is required', 'error');
      return;
    }

    if (formData.price <= 0) {
      addToast('Price must be greater than 0', 'error');
      return;
    }

    setSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price.toString());
      if (formData.sku) formDataToSend.append('sku', formData.sku);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('qty', formData.stock.toString());
      formDataToSend.append('lowStockThreshold', formData.lowStockThreshold.toString());
      if (formData.faq && formData.faq.length > 0) {
        formDataToSend.append('faq', JSON.stringify(formData.faq));
      }
      
      // Add categories
      if (formData.categoryIds.length > 0) {
        formDataToSend.append('categoryIds', JSON.stringify(formData.categoryIds));
      }
      
      // Add image URLs
      if (formData.imageUrls.length > 0) {
        formDataToSend.append('imageUrls', JSON.stringify(formData.imageUrls));
      }
      
      // Add image files
      imageFiles.forEach((file) => {
        formDataToSend.append('images', file);
      });

      await api.postForm('/products', formDataToSend);
      addToast('Product created successfully', 'success');
      setTimeout(() => {
        navigate('/admin/catalog');
      }, 1000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create product', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link to="/admin/catalog" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Catalog
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Product</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Product Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <ProductDescriptionAIGenerator
            productName={formData.name}
            currentDescription={formData.description}
            onDescriptionGenerated={(description) => setFormData({ ...formData, description })}
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
              min="0"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
              SKU
            </label>
            <input
              id="sku"
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity *
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              required
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 mb-1">
              Low Stock Threshold
            </label>
            <input
              id="lowStockThreshold"
              type="number"
              min="0"
              value={formData.lowStockThreshold}
              onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
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
                value={formData.categoryIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({ ...formData, categoryIds: selected });
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Images
          </label>
          
          {/* Image URLs */}
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                placeholder="Enter image URL"
                value={formData.imageUrlInput}
                onChange={(e) => setFormData({ ...formData, imageUrlInput: e.target.value })}
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
            
            {formData.imageUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {formData.imageUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Product ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImageUrl(index)}
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
          </div>

          {/* File Upload */}
          <div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {imageFiles.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">{imageFiles.length} file(s) selected</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'draft' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* FAQ Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Frequently Asked Questions (FAQ)
          </label>
          <ProductFAQAIGenerator
            productName={formData.name}
            productDescription={formData.description}
            currentFAQ={formData.faq}
            onFAQGenerated={(faqs) => setFormData({ ...formData, faq: faqs })}
          />
          <div className="space-y-3">
            {formData.faq.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-4">
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Question {index + 1}
                  </label>
                  <input
                    type="text"
                    value={item.question || ''}
                    onChange={(e) => {
                      const updatedFAQ = [...formData.faq];
                      updatedFAQ[index] = { ...updatedFAQ[index], question: e.target.value };
                      setFormData({ ...formData, faq: updatedFAQ });
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
                      const updatedFAQ = [...formData.faq];
                      updatedFAQ[index] = { ...updatedFAQ[index], answer: e.target.value };
                      setFormData({ ...formData, faq: updatedFAQ });
                    }}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="Enter answer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updatedFAQ = formData.faq.filter((_, i) => i !== index);
                    setFormData({ ...formData, faq: updatedFAQ });
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
                setFormData({ ...formData, faq: [...formData.faq, { question: '', answer: '' }] });
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + Add FAQ
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" variant="primary" isLoading={saving}>
            Create Product
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


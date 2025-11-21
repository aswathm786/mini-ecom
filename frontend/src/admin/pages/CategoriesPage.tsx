/**
 * Admin Categories Page
 * 
 * Full CRUD for product categories.
 */

import { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminApi';
import { DatasetTable } from '../components/DatasetTable';
import { Button } from '../../components/Button';
import { ToastContainer } from '../../components/Toast';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  image?: string;
  createdAt: Date;
}

export function CategoriesPage() {
  const api = useAdminApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    sortOrder: 0,
    image: '',
  });
  const [imageInputType, setImageInputType] = useState<'link' | 'upload'>('link');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadCategories();
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

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<any>('/categories');
      // Handle both { data: [...] } and direct array responses
      const categoriesList = Array.isArray(response) ? response : (response.data || []);
      setCategories(categoriesList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      addToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ name: '', description: '', parentId: '', sortOrder: 0, image: '' });
    setEditingCategory(null);
    setImageInputType('link');
    setImageFile(null);
    setShowCreateModal(true);
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      parentId: category.parentId || '',
      sortOrder: category.sortOrder,
      image: category.image || '',
    });
    // Auto-detect input type based on existing image
    if (category.image) {
      const isUrl = category.image.startsWith('http://') || category.image.startsWith('https://');
      setImageInputType(isUrl ? 'link' : 'upload');
    } else {
      setImageInputType('link');
    }
    setImageFile(null);
    setEditingCategory(category);
    setShowCreateModal(true);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/categories/${category._id}`);
      addToast('Category deleted successfully', 'success');
      await loadCategories();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete category', 'error');
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('image', file);
      
      // Use the same upload endpoint pattern as products
      const response = await api.postForm<{ url: string }>('/products/upload-image', formDataToSend);
      return response.url || null;
    } catch (err) {
      addToast('Failed to upload image', 'error');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      addToast('Category name is required', 'error');
      return;
    }

    try {
      let imageUrl = formData.image.trim();
      
      // If file upload is selected, upload the file first
      if (imageInputType === 'upload' && imageFile) {
        const uploadedUrl = await handleImageUpload(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          return; // Stop if upload failed
        }
      }

      const payload: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sortOrder: formData.sortOrder,
        image: imageUrl || undefined,
      };
      
      if (formData.parentId) {
        payload.parentId = formData.parentId;
      }

      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, payload);
        addToast('Category updated successfully', 'success');
      } else {
        await api.post('/categories', payload);
        addToast('Category created successfully', 'success');
      }

      setShowCreateModal(false);
      setEditingCategory(null);
      setImageFile(null);
      await loadCategories();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save category', 'error');
    }
  };

  const getParentName = (parentId?: string): string => {
    if (!parentId) return 'None';
    const parent = categories.find(c => c._id === parentId);
    return parent?.name || 'Unknown';
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (category: Category) => (
        <div className="flex items-center gap-3">
          {category.image && (
            <img
              src={category.image}
              alt={category.name}
              className="w-12 h-12 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div>
            <p className="font-medium text-gray-900">{category.name}</p>
            <p className="text-sm text-gray-500">/{category.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (category: Category) => (
        <p className="text-sm text-gray-600 truncate max-w-xs">
          {category.description || '—'}
        </p>
      ),
    },
    {
      key: 'parent',
      label: 'Parent',
      render: (category: Category) => (
        <span className="text-sm text-gray-600">{getParentName(category.parentId)}</span>
      ),
    },
    {
      key: 'sortOrder',
      label: 'Sort Order',
      render: (category: Category) => (
        <span className="text-sm text-gray-600">{category.sortOrder}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (category: Category) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(category)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(category)}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <Button onClick={handleCreate}>Create Category</Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <DatasetTable
        data={categories}
        columns={columns}
        loading={loading}
        emptyMessage="No categories found. Create your first category to get started."
      />

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
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
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category
                </label>
                <select
                  id="parentId"
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">None (Top Level)</option>
                  {categories
                    .filter(c => !editingCategory || c._id !== editingCategory._id)
                    .map(category => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Image
                </label>
                
                {/* Current Image Preview */}
                {formData.image && (
                  <div className="mb-3 relative inline-block">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded border border-gray-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, image: '' });
                        setImageFile(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                      title="Delete image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Input Type Selection */}
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category-image-input-type"
                      checked={imageInputType === 'link'}
                      onChange={() => setImageInputType('link')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Use Link/URL</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category-image-input-type"
                      checked={imageInputType === 'upload'}
                      onChange={() => setImageInputType('upload')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Upload Image</span>
                  </label>
                </div>

                {/* URL Input */}
                {imageInputType === 'link' && (
                  <div>
                    <input
                      id="image"
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter a direct image URL (must be publicly accessible).
                    </p>
                  </div>
                )}

                {/* File Upload Input */}
                {imageInputType === 'upload' && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          // Show preview immediately
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setFormData({ ...formData, image: event.target.result as string });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      disabled={uploadingImage}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                    {uploadingImage && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                    <p className="mt-1 text-xs text-gray-500">
                      Upload an image file. Recommended size: 400x400px or larger.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" variant="primary">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCategory(null);
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


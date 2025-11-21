/**
 * Admin Catalog Page
 * 
 * Products list with quick edit stock (inline), link to edit page.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminApi } from '../hooks/useAdminApi';
import { DatasetTable } from '../components/DatasetTable';
import { FiltersBar } from '../components/FiltersBar';
import { formatCurrency } from '../../lib/format';
import { Button } from '../../components/Button';

export function CatalogPage() {
  const navigate = useNavigate();
  const api = useAdminApi();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [editingStock, setEditingStock] = useState<Record<string, number>>({});

  useEffect(() => {
    loadProducts();
  }, [page, filters]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams: Record<string, any> = {
        page: page.toString(),
        limit: '20',
      };
      if (filters.search) queryParams.search = filters.search;
      if (filters.category) queryParams.category = filters.category;

      const data = await api.get<{ items?: any[]; total?: number; pages?: number }>('/products', queryParams);
      setProducts(data.items ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = async (productId: string, newStock: number) => {
    try {
      await api.put(`/products/${productId}`, { stock: newStock });
      await loadProducts();
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (product: any) => (
        <div>
          <p className="font-medium text-gray-900">{product.name}</p>
          <p className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</p>
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      render: (product: any) => formatCurrency(product.price),
    },
    {
      key: 'stock',
      label: 'Stock',
      render: (product: any) => {
        const isEditing = editingStock[product._id] !== undefined;
        const stockValue = isEditing ? editingStock[product._id] : product.stock;
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={stockValue}
              onChange={(e) => setEditingStock({ ...editingStock, [product._id]: parseInt(e.target.value) || 0 })}
              onBlur={() => {
                if (stockValue !== product.stock) {
                  handleStockChange(product._id, stockValue);
                }
                setEditingStock((prev) => {
                  const next = { ...prev };
                  delete next[product._id];
                  return next;
                });
              }}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            {product.stock < 10 && (
              <span className="text-xs text-red-600 font-medium">Low</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (product: any) => (
        <span className={`px-2 py-1 text-xs font-medium rounded ${
          product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {product.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (product: any) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/admin/catalog/${product._id}/edit`)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Catalog</h1>
        <Button onClick={() => navigate('/admin/catalog/new')}>
          Create Product
        </Button>
      </div>

      <FiltersBar
        filters={filters}
        onFilterChange={(key, value) => {
          setFilters({ ...filters, [key]: value });
          setPage(1);
        }}
        searchPlaceholder="Search products..."
        customFilters={[
          {
            key: 'category',
            label: 'Category',
            type: 'text',
          },
        ]}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <DatasetTable
        data={products}
        columns={columns}
        loading={loading}
        page={page}
        pages={pages}
        total={total}
        onPageChange={setPage}
        emptyMessage="No products found"
      />
    </div>
  );
}


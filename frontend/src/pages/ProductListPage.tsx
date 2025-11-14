/**
 * Product List Page
 * 
 * Displays products with filters, pagination, and search.
 */

import { useSearchParams } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeleton } from './ProductSkeleton';
import { Pagination } from '../components/Pagination';
import { FilterSidebar } from '../components/FilterSidebar';
import { useState } from 'react';
import { ToastContainer } from '../components/Toast';

export function ProductListPage() {
  const [searchParams] = useSearchParams();
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const q = searchParams.get('q') || undefined;
  const category = searchParams.get('category') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);

  const { products, loading, error, total, pages, setPage } = useProducts({
    q,
    category,
    page,
    limit: 20,
  });

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <FilterSidebar
            categories={[]} // TODO: Fetch from API
            selectedCategory={category}
            onCategoryChange={(catId) => {
              const params = new URLSearchParams(searchParams);
              if (catId) {
                params.set('category', catId);
              } else {
                params.delete('category');
              }
              params.set('page', '1');
              window.location.search = params.toString();
            }}
          />
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {q ? `Search Results for "${q}"` : 'All Products'}
            </h1>
            {total > 0 && (
              <p className="text-gray-600">
                Showing {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} of {total} results
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onAddToCart={() => addToast(`${product.name} added to cart`, 'success')}
                  />
                ))}
              </div>
              <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No products found.</p>
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}


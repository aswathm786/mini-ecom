/**
 * Home Page
 * 
 * Landing page with hero banner, featured categories, and product grid.
 */

import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeleton } from './ProductSkeleton';
import { useEffect, useState } from 'react';
import { ToastContainer } from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { AISearchBar } from '../components/ai/AISearchBar';

export function HomePage() {
  const { products, loading } = useProducts({ limit: 8 });
  const { settings } = useTheme();
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [marketing, setMarketing] = useState<any>(null);
  const [categories, setCategories] = useState<Array<{ _id: string; name: string; slug: string; image?: string }>>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    fetch('/api/marketing')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setMarketing(data.data);
        }
      })
      .catch(() => {});

    // Fetch categories
    setCategoriesLoading(true);
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.data) {
          // Limit to 4 categories for display
          setCategories(data.data.slice(0, 4));
        }
      })
      .catch(() => {})
      .finally(() => {
        setCategoriesLoading(false);
      });
  }, []);

  return (
    <>
      {/* Hero Banner */}
      <section
        className="relative text-white py-16 md:py-24 overflow-hidden"
        style={{
          backgroundImage: marketing?.banners?.[0]?.imageUrl
            ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${marketing.banners[0].imageUrl})`
            : settings?.['theme.heroImage']
            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${settings['theme.heroImage']})`
            : `linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg" style={{ color: '#FFFFFF' }}>
              {marketing?.banners?.[0]?.title || settings?.['theme.siteTagline'] || 'Handcrafted Treasures for Your Home'}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-8 opacity-90">
              {marketing?.banners?.[0]?.subtitle ||
                settings?.['theme.siteTagline'] ||
                'Discover unique, artisanal products made with care'}
            </p>
            <div className="max-w-2xl mx-auto">
              <AISearchBar className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {marketing?.announcements?.length ? (
        <section className="bg-amber-50 border-y border-amber-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-4">
            {marketing.announcements.map((announcement: any, idx: number) => (
              <span
                key={idx}
                className="text-sm font-medium px-3 py-1 rounded-full bg-white text-amber-800 shadow-sm"
              >
                {announcement.message}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* Featured Categories */}
      {categories.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
            {categoriesLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                    <div className="w-full h-32 sm:h-40 bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <Link
                    key={category._id}
                    to={`/products?category=${category.slug}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="aspect-w-1 aspect-h-1 bg-gray-200 overflow-hidden">
                      <img
                        src={category.image || '/placeholder.png'}
                        alt={category.name}
                        className="w-full h-32 sm:h-40 object-cover transition-transform duration-300 hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="font-semibold" style={{ color: 'var(--color-text, #111827)' }}>
                        {category.name}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text, #111827)' }}>
              Featured Products
            </h2>
            <Link
              to="/products"
              className="font-medium transition-colors hover:opacity-75"
              style={{ color: 'var(--color-primary, #dc2626)' }}
            >
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAddToCart={() => addToast(`${product.name} added to cart`, 'success')}
                />
              ))}
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No products found.</p>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

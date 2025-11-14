/**
 * Home Page
 * 
 * Landing page with hero banner, featured categories, and product grid.
 */

import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeleton } from './ProductSkeleton';
import { SearchBar } from './_components/SearchBar';
import { useState } from 'react';
import { ToastContainer } from '../components/Toast';

export function HomePage() {
  const { products, loading } = useProducts({ limit: 8 });
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <>
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Handcrafted Treasures for Your Home
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Discover unique, artisanal products made with care
            </p>
            <SearchBar
              placeholder="Search for products..."
              className="max-w-2xl mx-auto"
            />
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Home Decor', slug: 'home-decor', image: '/placeholder.png' },
              { name: 'Kitchen & Dining', slug: 'kitchen-dining', image: '/placeholder.png' },
              { name: 'Accessories', slug: 'accessories', image: '/placeholder.png' },
              { name: 'Gifts', slug: 'gifts', image: '/placeholder.png' },
            ].map((category) => (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-w-1 aspect-h-1 bg-gray-200">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            <Link
              to="/products"
              className="text-primary-600 hover:text-primary-700 font-medium"
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

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

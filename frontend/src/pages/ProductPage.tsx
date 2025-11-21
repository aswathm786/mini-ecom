/**
 * Product Detail Page
 * 
 * Displays product details, gallery, and add-to-cart functionality.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { csrfFetch } from '../lib/csrfFetch';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/format';
import { ProductGallery } from '../components/ProductGallery';
import { QtyInput } from '../components/QtyInput';
import { Button } from '../components/Button';
import { Product } from '../hooks/useProducts';
import { ToastContainer } from '../components/Toast';
import { ReviewSection } from '../components/ReviewSection';

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }>>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;

      setLoading(true);
      setError(null);

      try {
        const response = await csrfFetch(`/api/products/${slug}`);
        if (response.ok && response.data) {
          setProduct(response.data);
        } else {
          setError(response.error || 'Product not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleAddToCart = async () => {
    if (!product || !product._id) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      // Redirect to login with current product page as redirect parameter
      const currentPath = `/product/${slug}`;
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    setIsAdding(true);
    try {
      // Ensure productId is a string
      const productId = typeof product._id === 'string' ? product._id : String(product._id);
      await addItem(productId, quantity);
      addToast(`${product.name} added to cart`, 'success');
      setQuantity(1); // Reset quantity after adding
    } catch (err) {
      console.error('Error adding to cart:', err);
      // If error is due to authentication, redirect to login
      if (err instanceof Error && (err.message.includes('Authentication') || err.message.includes('401'))) {
        const currentPath = `/product/${slug}`;
        navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
      } else {
        addToast(err instanceof Error ? err.message : 'Failed to add to cart', 'error');
      }
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-200 rounded-lg h-96"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error || 'Product not found'}</p>
        </div>
      </div>
    );
  }

  const isInStock = product.inventory && product.inventory.qty > 0;
  const maxQty = isInStock ? Math.min(product.inventory.qty, 999) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Gallery */}
        <div>
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
          
          <div className="mb-4">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(product.price)}
            </span>
          </div>

          {isInStock ? (
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                In Stock ({product.inventory.qty} available)
              </span>
            </div>
          ) : (
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">
                Out of Stock
              </span>
            </div>
          )}

          <div className="mb-6">
            <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
          </div>

          {/* Add to Cart */}
          <div className="space-y-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <QtyInput
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={maxQty}
                disabled={!isInStock}
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={!isInStock || isAdding}
              isLoading={isAdding}
            >
              {isInStock ? 'Add to Cart' : 'Out of Stock'}
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      {product._id && (
        <ReviewSection
          productId={typeof product._id === 'string' ? product._id : String(product._id)}
          productSlug={product.slug}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

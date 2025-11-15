/**
 * Product Card Component
 * 
 * Displays product information in a card format for grid layouts.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/format';
import { useCart } from '../hooks/useCart';
import { Button } from './Button';
import { Product } from '../hooks/useProducts';

interface ProductCardProps {
  product: Product;
  onAddToCart?: () => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addItem(product._id, 1);
      onAddToCart?.();
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const isInStock = product.inventory && product.inventory.qty > 0;
  const mainImage = product.images?.[0]?.url || '/placeholder.png';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="aspect-w-1 aspect-h-1 bg-gray-200 overflow-hidden">
          <img
            src={mainImage}
            alt={product.images?.[0]?.alt || product.name}
            className="w-full h-48 sm:h-56 object-cover transition-transform duration-300 hover:scale-110"
            loading="lazy"
          />
        </div>
      </Link>
      
      <div className="p-4">
        <Link to={`/product/${product.slug}`}>
          <h3 
            className="text-lg font-semibold mb-2 transition-colors"
            style={{ 
              color: 'var(--color-text, #111827)',
            }}
          >
            <span className="hover:opacity-75" style={{ color: 'var(--color-primary, #dc2626)' }}>
              {product.name}
            </span>
          </h3>
        </Link>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold" style={{ color: 'var(--color-text, #111827)' }}>
            {formatCurrency(product.price)}
          </span>
          {isInStock ? (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
              In Stock
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
              Out of Stock
            </span>
          )}
        </div>
        
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.preventDefault();
            handleAddToCart();
          }}
          disabled={!isInStock || isAdding}
          isLoading={isAdding}
          aria-label={`Add ${product.name} to cart`}
        >
          {isInStock ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </div>
    </div>
  );
}

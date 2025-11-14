/**
 * Product Gallery Component
 * 
 * Image gallery with main image and thumbnail navigation.
 */

import { useState } from 'react';

interface ProductImage {
  filename: string;
  url: string;
  alt?: string;
}

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="bg-gray-200 rounded-lg aspect-square flex items-center justify-center">
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  const mainImage = images[selectedIndex] || images[0];

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square">
        <img
          src={mainImage.url}
          alt={mainImage.alt || productName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                selectedIndex === index
                  ? 'border-primary-600'
                  : 'border-transparent hover:border-gray-300'
              }`}
              aria-label={`View ${productName} image ${index + 1}`}
            >
              <img
                src={image.url}
                alt={image.alt || `${productName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


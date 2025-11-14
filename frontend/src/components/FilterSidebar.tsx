/**
 * Filter Sidebar Component
 * 
 * Filter UI for categories and price range (UI only, backend filters may be stubbed).
 */

import { useState } from 'react';

interface FilterSidebarProps {
  categories?: Array<{ id: string; name: string; slug: string }>;
  selectedCategory?: string;
  onCategoryChange?: (categoryId: string | null) => void;
  priceRange?: { min: number; max: number };
  onPriceRangeChange?: (min: number, max: number) => void;
}

export function FilterSidebar({
  categories = [],
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
}: FilterSidebarProps) {
  const [localPriceMin, setLocalPriceMin] = useState(priceRange?.min?.toString() || '');
  const [localPriceMax, setLocalPriceMax] = useState(priceRange?.max?.toString() || '');

  const handlePriceApply = () => {
    const min = localPriceMin ? parseFloat(localPriceMin) : 0;
    const max = localPriceMax ? parseFloat(localPriceMax) : Infinity;
    onPriceRangeChange?.(min, max);
  };

  return (
    <aside className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>

      {/* Categories */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="category"
              value=""
              checked={!selectedCategory}
              onChange={() => onCategoryChange?.(null)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">All Categories</span>
          </label>
          {categories.map((category) => (
            <label key={category.id} className="flex items-center">
              <input
                type="radio"
                name="category"
                value={category.id}
                checked={selectedCategory === category.id}
                onChange={() => onCategoryChange?.(category.id)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Price Range</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="price-min" className="block text-xs text-gray-600 mb-1">
              Min Price
            </label>
            <input
              id="price-min"
              type="number"
              value={localPriceMin}
              onChange={(e) => setLocalPriceMin(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="price-max" className="block text-xs text-gray-600 mb-1">
              Max Price
            </label>
            <input
              id="price-max"
              type="number"
              value={localPriceMax}
              onChange={(e) => setLocalPriceMax(e.target.value)}
              placeholder="No limit"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="button"
            onClick={handlePriceApply}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
          >
            Apply Price Filter
          </button>
        </div>
      </div>
    </aside>
  );
}


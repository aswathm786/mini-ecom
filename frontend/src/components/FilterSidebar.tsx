/**
 * Filter Sidebar Component
 * 
 * Filter UI for categories and price range with multiple category selection.
 */

import { useState, useEffect } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface FilterSidebarProps {
  selectedCategories?: string[];
  onCategoryChange?: (categoryIds: string[]) => void;
  priceRange?: { min: number; max: number };
  onPriceRangeChange?: (min: number, max: number) => void;
}

export function FilterSidebar({
  selectedCategories = [],
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
}: FilterSidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [localPriceMin, setLocalPriceMin] = useState(priceRange?.min?.toString() || '');
  const [localPriceMax, setLocalPriceMax] = useState(priceRange?.max?.toString() || '');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await csrfFetch('/api/categories');
      if (response.ok && response.data) {
        setCategories(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newSelected = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    onCategoryChange?.(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      onCategoryChange?.([]);
    } else {
      onCategoryChange?.(categories.map(c => c._id));
    }
  };

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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Categories</h3>
          {categories.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {selectedCategories.length === categories.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
        {loadingCategories ? (
          <div className="text-sm text-gray-500">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="text-sm text-gray-500">No categories available</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {categories.map((category) => (
              <label key={category._id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category._id)}
                  onChange={() => handleCategoryToggle(category._id)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{category.name}</span>
              </label>
            ))}
          </div>
        )}
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


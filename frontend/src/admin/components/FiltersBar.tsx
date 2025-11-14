/**
 * Filters Bar Component
 * 
 * Reusable filter bar for admin list pages.
 */

interface FilterOption {
  value: string;
  label: string;
}

interface FiltersBarProps {
  filters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  searchPlaceholder?: string;
  statusOptions?: FilterOption[];
  customFilters?: Array<{
    key: string;
    label: string;
    type: 'select' | 'date' | 'text';
    options?: FilterOption[];
  }>;
  onReset?: () => void;
}

export function FiltersBar({
  filters,
  onFilterChange,
  searchPlaceholder = 'Search...',
  statusOptions,
  customFilters,
  onReset,
}: FiltersBarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            id="search"
            type="text"
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Status Filter */}
        {statusOptions && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={filters.status || ''}
              onChange={(e) => onFilterChange('status', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Filters */}
        {customFilters?.map((filter) => (
          <div key={filter.key}>
            <label htmlFor={filter.key} className="block text-sm font-medium text-gray-700 mb-1">
              {filter.label}
            </label>
            {filter.type === 'select' ? (
              <select
                id={filter.key}
                value={filters[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All</option>
                {filter.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'date' ? (
              <input
                id={filter.key}
                type="date"
                value={filters[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <input
                id={filter.key}
                type="text"
                value={filters[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
          </div>
        ))}

        {/* Reset Button */}
        {onReset && (
          <div className="flex items-end">
            <button
              onClick={onReset}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface AISearchBarProps {
  placeholder?: string;
  className?: string;
}

export function AISearchBar({ placeholder = 'Search handcrafted goodies…', className = '' }: AISearchBarProps) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(params.get('q') || '');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/products?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label="Search catalog"
          className="w-full px-4 py-3 pl-12 pr-28 rounded-full shadow-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
          🔍
        </span>
        <button
          type="submit"
          disabled={!query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
        >
          Search
        </button>
      </form>
    </div>
  );
}



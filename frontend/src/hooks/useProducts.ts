/**
 * useProducts Hook
 * 
 * Fetches and manages product list with search, filters, and pagination.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '../lib/csrfFetch';

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: Array<{ filename: string; url: string; alt?: string }>;
  status: 'active' | 'inactive' | 'draft';
  categoryId?: string;
  inventory?: {
    qty: number;
    lowStockThreshold: number;
  };
}

interface UseProductsParams {
  q?: string;
  category?: string; // Legacy single category support
  categories?: string[]; // Multiple categories support
  page?: number;
  limit?: number;
  sort?: string;
}

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
  setPage: (page: number) => void;
  refetch: () => void;
}

export function useProducts(params: UseProductsParams = {}): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page || 1);
  const [pages, setPages] = useState(0);

  const limit = params.limit || 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params.q) queryParams.set('q', params.q);
      // Support both single category (legacy) and multiple categories
      if (params.categories && params.categories.length > 0) {
        params.categories.forEach(cat => queryParams.append('category', cat));
      } else if (params.category) {
        queryParams.set('category', params.category);
      }
      queryParams.set('page', page.toString());
      queryParams.set('limit', limit.toString());
      if (params.sort) queryParams.set('sort', params.sort);

      const response = await csrfFetch<any>(`/api/products?${queryParams.toString()}`);

      if (response.ok && response.data) {
        setProducts(response.data);
        // Handle meta from response (may be nested in data or at root)
        const meta = (response as any).meta;
        if (meta) {
          setTotal(meta.total || 0);
          setPages(meta.pages || 0);
        }
      } else {
        setError(response.error || 'Failed to fetch products');
        setProducts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [params.q, params.category, params.categories, params.sort, page, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    total,
    page,
    pages,
    setPage,
    refetch: fetchProducts,
  };
}


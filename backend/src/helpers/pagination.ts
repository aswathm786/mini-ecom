/**
 * Pagination Helpers
 * 
 * Utilities for parsing pagination query parameters and generating pagination metadata.
 */

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Parse pagination parameters from query string
 */
export function parsePagination(query: any): PaginationParams {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 20));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Generate pagination metadata
 */
export function getPaginationMeta(params: PaginationParams, total: number): PaginationMeta {
  const pages = Math.ceil(total / params.limit);
  
  return {
    page: params.page,
    limit: params.limit,
    total,
    pages,
    hasNext: params.page < pages,
    hasPrev: params.page > 1,
  };
}


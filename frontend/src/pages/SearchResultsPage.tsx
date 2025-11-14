/**
 * Search Results Page
 * 
 * Displays search results for query parameter.
 */

import { ProductListPage } from './ProductListPage';

export function SearchResultsPage() {
  // Reuse ProductListPage which handles search via query params
  return <ProductListPage />;
}


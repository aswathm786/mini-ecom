/**
 * useCart Hook
 * 
 * Manages shopping cart state, syncs with backend, and provides cart operations.
 * Supports optimistic updates and rollback on error.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { csrfFetch } from '../lib/csrfFetch';
import { getStorageItem, setStorageItem, removeStorageItem } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

export interface CartItem {
  productId: string;
  qty: number;
  priceAt: number;
  name?: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    images: Array<{ url: string; alt?: string }>;
  };
}

interface Cart {
  items: CartItem[];
}

const STORAGE_KEY = 'cart';

export function useCart() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const mergeAttemptedRef = useRef(false);
  const previousAuthRef = useRef(isAuthenticated);

  /**
   * Load cart from server or localStorage
   */
  const loadCart = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated) {
        // Load from server
        const response = await csrfFetch('/api/cart');
        if (response.ok && response.data?.items) {
          setItems(response.data.items);
          // Clear localStorage cart when authenticated
          removeStorageItem(STORAGE_KEY);
        } else {
          // Fallback to localStorage if server fails
          const localCart = getStorageItem<Cart>(STORAGE_KEY, { items: [] });
          setItems(localCart.items);
        }
      } else {
        // Load from localStorage for anonymous users
        const localCart = getStorageItem<Cart>(STORAGE_KEY, { items: [] });
        setItems(localCart.items);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      // Fallback to localStorage
      const localCart = getStorageItem<Cart>(STORAGE_KEY, { items: [] });
      setItems(localCart.items);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Save cart to localStorage
   */
  const saveToLocalStorage = useCallback((cartItems: CartItem[]) => {
    setStorageItem(STORAGE_KEY, { items: cartItems });
  }, []);

  /**
   * Sync cart to server (for authenticated users)
   */
  const sync = useCallback(async () => {
    if (!isAuthenticated || items.length === 0) {
      return;
    }

    setIsSyncing(true);
    try {
      // TODO: Implement server-side cart sync endpoint if needed
      // For now, individual operations handle syncing
    } catch (error) {
      console.error('Error syncing cart:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, items]);

  /**
   * Add item to cart
   */
  const addItem = useCallback(
    async (productId: string, qty: number = 1): Promise<boolean> => {
      // Get current items for rollback
      let currentItems: CartItem[] = [];
      setItems((prev) => {
        currentItems = prev;
        return prev;
      });

      // Optimistic update
      const existingItem = currentItems.find((item) => item.productId === productId);
      const optimisticItems = existingItem
        ? currentItems.map((item) =>
            item.productId === productId
              ? { ...item, qty: item.qty + qty }
              : item
          )
        : [
            ...currentItems,
            {
              productId,
              qty,
              priceAt: 0, // Will be updated from server response
              name: '', // Will be updated from server response
            },
          ];

      setItems(optimisticItems);
      saveToLocalStorage(optimisticItems);

      try {
        const response = await csrfFetch('/api/cart/add', {
          method: 'POST',
          body: JSON.stringify({ productId, qty }),
        });

        if (response.ok && response.data) {
          // Reload cart from server to get enriched product data
          // This ensures we have product images, slugs, etc.
          try {
            const cartResponse = await csrfFetch('/api/cart');
            if (cartResponse.ok && cartResponse.data?.items) {
              setItems(cartResponse.data.items);
              if (isAuthenticated) {
                removeStorageItem(STORAGE_KEY);
              } else {
                saveToLocalStorage(cartResponse.data.items);
              }
            } else {
              // Fallback to response data if reload fails
              setItems(response.data.items || optimisticItems);
              if (isAuthenticated) {
                removeStorageItem(STORAGE_KEY);
              } else {
                saveToLocalStorage(response.data.items || optimisticItems);
              }
            }
          } catch (reloadError) {
            // If reload fails, use the response data
            console.warn('Failed to reload cart after adding item:', reloadError);
            setItems(response.data.items || optimisticItems);
            if (isAuthenticated) {
              removeStorageItem(STORAGE_KEY);
            } else {
              saveToLocalStorage(response.data.items || optimisticItems);
            }
          }
          return true;
        } else {
          // Rollback on error
          setItems(currentItems);
          saveToLocalStorage(currentItems);
          // Check if error is due to authentication
          if (response.code === 'UNAUTHORIZED' || response.error?.includes('Authentication') || response.error?.includes('401')) {
            throw new Error('Authentication required');
          }
          throw new Error(response.error || 'Failed to add item to cart');
        }
      } catch (error) {
        // Rollback on error
        setItems(currentItems);
        saveToLocalStorage(currentItems);
        // Re-throw authentication errors as-is
        if (error instanceof Error && (error.message.includes('Authentication') || error.message.includes('401'))) {
          throw error;
        }
        throw error;
      }
    },
    [isAuthenticated, saveToLocalStorage]
  );

  /**
   * Update item quantity
   */
  const updateItem = useCallback(
    async (productId: string, qty: number): Promise<boolean> => {
      if (qty <= 0) {
        return removeItem(productId);
      }

      // Optimistic update
      const optimisticItems = items.map((item) =>
        item.productId === productId ? { ...item, qty } : item
      );
      setItems(optimisticItems);
      saveToLocalStorage(optimisticItems);

      try {
        const response = await csrfFetch('/api/cart/update', {
          method: 'POST',
          body: JSON.stringify({ productId, qty }),
        });

        if (response.ok && response.data) {
          setItems(response.data.items || optimisticItems);
          if (isAuthenticated) {
            removeStorageItem(STORAGE_KEY);
          } else {
            saveToLocalStorage(response.data.items || optimisticItems);
          }
          return true;
        } else {
          // Rollback
          setItems(items);
          saveToLocalStorage(items);
          throw new Error(response.error || 'Failed to update item');
        }
      } catch (error) {
        // Rollback
        setItems(items);
        saveToLocalStorage(items);
        throw error;
      }
    },
    [items, isAuthenticated, saveToLocalStorage]
  );

  /**
   * Remove item from cart
   */
  const removeItem = useCallback(
    async (productId: string): Promise<boolean> => {
      // Optimistic update
      const optimisticItems = items.filter((item) => item.productId !== productId);
      setItems(optimisticItems);
      saveToLocalStorage(optimisticItems);

      try {
        const response = await csrfFetch('/api/cart/remove', {
          method: 'POST',
          body: JSON.stringify({ productId }),
        });

        if (response.ok) {
          if (response.data) {
            setItems(response.data.items || optimisticItems);
            if (isAuthenticated) {
              removeStorageItem(STORAGE_KEY);
            } else {
              saveToLocalStorage(response.data.items || optimisticItems);
            }
          }
          return true;
        } else {
          // Rollback
          setItems(items);
          saveToLocalStorage(items);
          throw new Error(response.error || 'Failed to remove item');
        }
      } catch (error) {
        // Rollback
        setItems(items);
        saveToLocalStorage(items);
        throw error;
      }
    },
    [items, isAuthenticated, saveToLocalStorage]
  );

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(async (): Promise<boolean> => {
    // Optimistic update
    const previousItems = items;
    setItems([]);
    removeStorageItem(STORAGE_KEY);

      try {
        const response = await csrfFetch('/api/cart/clear', {
          method: 'POST',
        });

        if (response.ok) {
          return true;
        } else {
          // Rollback
          setItems(previousItems);
          saveToLocalStorage(previousItems);
          throw new Error(response.error || 'Failed to clear cart');
        }
      } catch (error) {
        // Rollback
        setItems(previousItems);
        saveToLocalStorage(previousItems);
        throw error;
      }
  }, [items, saveToLocalStorage]);

  /**
   * Merge localStorage cart with server cart on login
   */
  const mergeCarts = useCallback(async () => {
    if (!isAuthenticated || mergeAttemptedRef.current) {
      return;
    }

    const localCart = getStorageItem<Cart>(STORAGE_KEY, { items: [] });
    if (localCart.items.length === 0) {
      mergeAttemptedRef.current = true;
      return;
    }

    // Mark as attempted to prevent infinite loops
    mergeAttemptedRef.current = true;

    try {
      // Add each local item to server cart (skip items that fail)
      const itemsToAdd = [...localCart.items];
      for (const item of itemsToAdd) {
        try {
          await addItem(item.productId, item.qty);
        } catch (error) {
          // Log error but continue with other items
          console.warn(`Failed to merge cart item ${item.productId}:`, error);
        }
      }
      // Clear localStorage after merge attempt (even if some items failed)
      removeStorageItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error merging carts:', error);
    }
  }, [isAuthenticated, addItem]);

  // Reset merge flag when auth state changes from authenticated to unauthenticated
  useEffect(() => {
    if (previousAuthRef.current && !isAuthenticated) {
      mergeAttemptedRef.current = false;
    }
    previousAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Load cart on mount and when auth state changes
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Merge carts when user logs in (only once)
  useEffect(() => {
    if (isAuthenticated && !mergeAttemptedRef.current && !isLoading) {
      // Use setTimeout to ensure this runs after loadCart completes
      const timer = setTimeout(() => {
        mergeCarts();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, mergeCarts]);

  // Calculate totals (with validation to prevent corrupted data)
  const subtotal = items.reduce((sum, item) => {
    const qty = typeof item.qty === 'number' && item.qty > 0 ? item.qty : 0;
    const price = typeof item.priceAt === 'number' && item.priceAt >= 0 ? item.priceAt : 0;
    return sum + (price * qty);
  }, 0);
  const itemCount = items.reduce((sum, item) => {
    const qty = typeof item.qty === 'number' && item.qty > 0 ? item.qty : 0;
    return sum + qty;
  }, 0);

  return {
    items,
    isLoading,
    isSyncing,
    subtotal,
    itemCount,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    sync,
    refetch: loadCart,
  };
}


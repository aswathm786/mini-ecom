/**
 * Orders Page Test
 * 
 * Tests orders page rendering, pagination, and navigation to order details.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { OrdersPage } from '../pages/account/OrdersPage';
import { OrderDetailsPage } from '../pages/account/OrderDetailsPage';
import { useOrders } from '../hooks/useOrders';
import { csrfFetch } from '../lib/csrfFetch';

jest.mock('../hooks/useOrders');
jest.mock('../lib/csrfFetch');

const mockUseOrders = useOrders as jest.MockedFunction<typeof useOrders>;
const mockCsrfFetch = csrfFetch as jest.MockedFunction<typeof csrfFetch>;

const mockOrders = [
  {
    _id: 'order_123',
    userId: 'user_1',
    items: [{ productId: 'prod_1', name: 'Test Product', qty: 2, priceAt: 500 }],
    amount: 1000,
    currency: 'INR',
    status: 'paid',
    shippingAddress: {
      name: 'Test User',
      street: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      country: 'India',
    },
    placedAt: '2024-01-01T00:00:00Z',
  },
  {
    _id: 'order_456',
    userId: 'user_1',
    items: [{ productId: 'prod_2', name: 'Another Product', qty: 1, priceAt: 300 }],
    amount: 300,
    currency: 'INR',
    status: 'shipped',
    shippingAddress: {
      name: 'Test User',
      street: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      country: 'India',
    },
    placedAt: '2024-01-02T00:00:00Z',
  },
];

describe('OrdersPage', () => {
  const mockSetPage = jest.fn();
  const mockSetStatus = jest.fn();
  const mockSetSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOrders.mockReturnValue({
      orders: mockOrders,
      loading: false,
      error: null,
      total: 2,
      page: 1,
      pages: 1,
      setPage: mockSetPage,
      setStatus: mockSetStatus,
      setSearch: mockSetSearch,
    });
  });

  it('should render orders list', () => {
    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    expect(screen.getByText('My Orders')).toBeInTheDocument();
    expect(screen.getByText('Order #order_123')).toBeInTheDocument();
    expect(screen.getByText('Order #order_456')).toBeInTheDocument();
  });

  it('should display order status filters', () => {
    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    expect(screen.getByText('All Orders')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('should filter orders by status when filter is clicked', () => {
    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    const pendingFilter = screen.getByText('Pending');
    fireEvent.click(pendingFilter);

    expect(mockSetStatus).toHaveBeenCalledWith('pending');
    expect(mockSetPage).toHaveBeenCalledWith(1);
  });

  it('should navigate to order details when order is clicked', () => {
    const { container } = render(
      <BrowserRouter>
        <Routes>
          <Route path="/account/orders" element={<OrdersPage />} />
          <Route path="/account/orders/:id" element={<OrderDetailsPage />} />
        </Routes>
      </BrowserRouter>
    );

    const orderLink = screen.getByText('Order #order_123').closest('a');
    expect(orderLink).toHaveAttribute('href', '/account/orders/order_123');
  });

  it('should show pagination controls when multiple pages exist', () => {
    mockUseOrders.mockReturnValue({
      orders: mockOrders,
      loading: false,
      error: null,
      total: 25,
      page: 1,
      pages: 2,
      setPage: mockSetPage,
      setStatus: mockSetStatus,
      setSearch: mockSetSearch,
    });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('should handle search query', () => {
    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search by order ID...');
    fireEvent.change(searchInput, { target: { value: 'order_123' } });
    fireEvent.submit(searchInput.closest('form')!);

    expect(mockSetSearch).toHaveBeenCalledWith('order_123');
    expect(mockSetPage).toHaveBeenCalledWith(1);
  });

  it('should display empty state when no orders', () => {
    mockUseOrders.mockReturnValue({
      orders: [],
      loading: false,
      error: null,
      total: 0,
      page: 1,
      pages: 0,
      setPage: mockSetPage,
      setStatus: mockSetStatus,
      setSearch: mockSetSearch,
    });

    render(
      <BrowserRouter>
        <OrdersPage />
      </BrowserRouter>
    );

    expect(screen.getByText('No orders found.')).toBeInTheDocument();
  });
});


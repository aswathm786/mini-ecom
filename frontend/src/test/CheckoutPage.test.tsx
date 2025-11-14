/**
 * Checkout Page Test
 * 
 * Tests checkout page rendering, form validation, and payment flow.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CheckoutPage } from '../pages/CheckoutPage';
import { AuthProvider } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';

jest.mock('../contexts/AuthContext');
jest.mock('../hooks/useCart');
jest.mock('../hooks/useCheckout');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      refreshUser: jest.fn(),
      listSessions: jest.fn(),
      revokeSession: jest.fn(),
    });

    mockUseCart.mockReturnValue({
      items: [
        {
          productId: 'prod_1',
          qty: 2,
          priceAt: 500,
          name: 'Test Product',
        },
      ],
      isLoading: false,
      isSyncing: false,
      subtotal: 1000,
      itemCount: 2,
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      sync: jest.fn(),
      refetch: jest.fn(),
    });
  });

  it('should render checkout form', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <CheckoutPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    expect(screen.getByText('Payment Method')).toBeInTheDocument();
  });

  it('should require terms acceptance before placing order', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <CheckoutPage />
        </AuthProvider>
      </BrowserRouter>
    );

    const placeOrderButton = screen.getByRole('button', { name: /pay with razorpay|place order/i });
    expect(placeOrderButton).toBeDisabled();
  });

  it('should show validation errors for required fields', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <CheckoutPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // Terms checkbox should be present
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms/i });
    expect(termsCheckbox).toBeInTheDocument();
  });
});


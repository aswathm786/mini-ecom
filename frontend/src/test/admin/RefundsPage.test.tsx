/**
 * Refunds Page Test
 * 
 * Tests refund processing flow: click process, confirm modal, API call, status update.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RefundsPage } from '../../admin/pages/RefundsPage';
import { useRefunds } from '../../admin/hooks/useRefunds';
import { useAdminApi } from '../../admin/hooks/useAdminApi';

jest.mock('../../admin/hooks/useRefunds');
jest.mock('../../admin/hooks/useAdminApi');

const mockUseRefunds = useRefunds as jest.MockedFunction<typeof useRefunds>;
const mockUseAdminApi = useAdminApi as jest.MockedFunction<typeof useAdminApi>;

const mockRefunds = [
  {
    _id: 'refund_123',
    orderId: 'order_123',
    amount: 500,
    currency: 'INR',
    reason: 'Customer request',
    status: 'pending',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('RefundsPage', () => {
  const mockProcessRefund = jest.fn();
  const mockSetFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRefunds.mockReturnValue({
      refunds: mockRefunds,
      loading: false,
      error: null,
      total: 1,
      page: 1,
      pages: 1,
      setPage: jest.fn(),
      setFilters: mockSetFilters,
      processRefund: mockProcessRefund,
      refetch: jest.fn(),
    });
    mockUseAdminApi.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    });
  });

  it('should render refunds list', () => {
    render(
      <BrowserRouter>
        <RefundsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Refunds')).toBeInTheDocument();
    expect(screen.getByText('refund_123')).toBeInTheDocument();
  });

  it('should open confirm modal when process button is clicked', () => {
    render(
      <BrowserRouter>
        <RefundsPage />
      </BrowserRouter>
    );

    const processButton = screen.getByText('Process');
    fireEvent.click(processButton);

    expect(screen.getByText('Process Refund')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to process this refund/)).toBeInTheDocument();
  });

  it('should call processRefund API when confirmed', async () => {
    mockProcessRefund.mockResolvedValue(true);

    render(
      <BrowserRouter>
        <RefundsPage />
      </BrowserRouter>
    );

    const processButton = screen.getByText('Process');
    fireEvent.click(processButton);

    const confirmButton = screen.getByText('Process Refund');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockProcessRefund).toHaveBeenCalledWith('refund_123');
    });
  });

  it('should show success toast after processing refund', async () => {
    mockProcessRefund.mockResolvedValue(true);

    render(
      <BrowserRouter>
        <RefundsPage />
      </BrowserRouter>
    );

    const processButton = screen.getByText('Process');
    fireEvent.click(processButton);

    const confirmButton = screen.getByText('Process Refund');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Refund processed successfully')).toBeInTheDocument();
    });
  });
});


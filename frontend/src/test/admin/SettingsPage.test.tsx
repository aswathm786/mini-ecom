/**
 * Settings Page Test
 * 
 * Tests settings save flow: change toggles, save, API called, success toast, cache updated.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SettingsPage } from '../../admin/pages/SettingsPage';
import { useSettings } from '../../admin/hooks/useSettings';

jest.mock('../../admin/hooks/useSettings');

const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;

const mockSettings = {
  'payments.razorpay.enabled': true,
  'payments.razorpay.key_id': 'rzp_test_key',
  'payments.razorpay.key_secret': 'secret_key',
  'payments.cod.enabled': true,
  'shipping.delhivery.enabled': false,
  'store.name': 'Handmade Harmony',
  'invoice.prefix': 'INV',
};

describe('SettingsPage', () => {
  const mockUpdateSettings = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSettings.mockReturnValue({
      settings: mockSettings,
      loading: false,
      error: null,
      updateSettings: mockUpdateSettings,
      refetch: jest.fn(),
    });
  });

  it('should render settings form', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Razorpay')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable COD')).toBeInTheDocument();
  });

  it('should update local state when toggle is changed', () => {
    render(<SettingsPage />);

    const razorpayToggle = screen.getByLabelText('Enable Razorpay');
    expect(razorpayToggle).toBeChecked();

    fireEvent.click(razorpayToggle);
    expect(razorpayToggle).not.toBeChecked();
  });

  it('should call updateSettings API when form is submitted', async () => {
    mockUpdateSettings.mockResolvedValue(true);

    render(<SettingsPage />);

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  it('should show success toast after saving settings', async () => {
    mockUpdateSettings.mockResolvedValue(true);

    render(<SettingsPage />);

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });
  });

  it('should show error toast if save fails', async () => {
    mockUpdateSettings.mockResolvedValue(false);

    render(<SettingsPage />);

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save settings')).toBeInTheDocument();
    });
  });
});


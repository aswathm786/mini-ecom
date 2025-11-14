/**
 * Tickets Flow Test
 * 
 * Tests ticket creation modal behavior and form submission.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TicketsPage } from '../pages/account/TicketsPage';
import { useTickets } from '../hooks/useTickets';
import { uploadFile } from '../lib/fileUpload';

jest.mock('../hooks/useTickets');
jest.mock('../lib/fileUpload');

const mockUseTickets = useTickets as jest.MockedFunction<typeof useTickets>;
const mockUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>;

describe('TicketsFlow', () => {
  const mockCreateTicket = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTickets.mockReturnValue({
      tickets: [],
      loading: false,
      error: null,
      createTicket: mockCreateTicket,
      getTicket: jest.fn(),
      replyToTicket: jest.fn(),
      closeTicket: jest.fn(),
      refetch: mockRefetch,
    });
  });

  it('should render tickets page with create button', () => {
    render(
      <BrowserRouter>
        <TicketsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Support Tickets')).toBeInTheDocument();
    expect(screen.getByText('Create Ticket')).toBeInTheDocument();
  });

  it('should open create ticket modal when button is clicked', () => {
    render(
      <BrowserRouter>
        <TicketsPage />
      </BrowserRouter>
    );

    const createButton = screen.getByText('Create Ticket');
    fireEvent.click(createButton);

    expect(screen.getByText('Create Support Ticket')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject *')).toBeInTheDocument();
    expect(screen.getByLabelText('Message *')).toBeInTheDocument();
  });

  it('should submit ticket with subject and message', async () => {
    mockCreateTicket.mockResolvedValue({
      _id: 'ticket_123',
      userId: 'user_1',
      subject: 'Test Ticket',
      status: 'open',
      messages: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    render(
      <BrowserRouter>
        <TicketsPage />
      </BrowserRouter>
    );

    // Open modal
    fireEvent.click(screen.getByText('Create Ticket'));

    // Fill form
    const subjectInput = screen.getByLabelText('Subject *');
    const messageInput = screen.getByLabelText('Message *');

    fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
    fireEvent.change(messageInput, { target: { value: 'Test message content' } });

    // Submit
    const submitButton = screen.getByText('Create Ticket');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTicket).toHaveBeenCalledWith({
        subject: 'Test Subject',
        message: 'Test message content',
        attachments: undefined,
      });
    });
  });

  it('should upload attachments before submitting ticket', async () => {
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    mockUploadFile.mockResolvedValue({
      uploadId: 'upload_123',
      filename: 'test.pdf',
    });
    mockCreateTicket.mockResolvedValue({
      _id: 'ticket_123',
      userId: 'user_1',
      subject: 'Test Ticket',
      status: 'open',
      messages: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    render(
      <BrowserRouter>
        <TicketsPage />
      </BrowserRouter>
    );

    // Open modal
    fireEvent.click(screen.getByText('Create Ticket'));

    // Fill form
    fireEvent.change(screen.getByLabelText('Subject *'), { target: { value: 'Test Subject' } });
    fireEvent.change(screen.getByLabelText('Message *'), { target: { value: 'Test message' } });

    // Upload file
    const fileInput = screen.getByLabelText('Attachments (optional)');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Submit
    fireEvent.click(screen.getByText('Create Ticket'));

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(mockFile);
      expect(mockCreateTicket).toHaveBeenCalledWith({
        subject: 'Test Subject',
        message: 'Test message',
        attachments: ['upload_123'],
      });
    });
  });

  it('should show validation error when subject is missing', async () => {
    render(
      <BrowserRouter>
        <TicketsPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Create Ticket'));
    fireEvent.change(screen.getByLabelText('Message *'), { target: { value: 'Test message' } });
    fireEvent.click(screen.getByText('Create Ticket'));

    await waitFor(() => {
      expect(mockCreateTicket).not.toHaveBeenCalled();
    });
  });

  it('should close modal after successful submission', async () => {
    mockCreateTicket.mockResolvedValue({
      _id: 'ticket_123',
      userId: 'user_1',
      subject: 'Test Ticket',
      status: 'open',
      messages: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    render(
      <BrowserRouter>
        <TicketsPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Create Ticket'));
    fireEvent.change(screen.getByLabelText('Subject *'), { target: { value: 'Test Subject' } });
    fireEvent.change(screen.getByLabelText('Message *'), { target: { value: 'Test message' } });
    fireEvent.click(screen.getByText('Create Ticket'));

    await waitFor(() => {
      expect(mockCreateTicket).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });

    // Modal should be closed
    expect(screen.queryByText('Create Support Ticket')).not.toBeInTheDocument();
  });
});


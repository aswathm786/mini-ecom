/**
 * Ticket Create Modal Component
 * 
 * Modal for creating support tickets.
 */

import { useState } from 'react';
import { Button } from '../Button';
import { uploadFile, validateFile } from '../../lib/fileUpload';

interface TicketCreateModalProps {
  isOpen: boolean;
  orderId?: string;
  onClose: () => void;
  onSubmit: (data: { subject: string; message: string; attachments?: string[] }) => Promise<void>;
}

export function TicketCreateModal({ isOpen, orderId, onClose, onSubmit }: TicketCreateModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        setError(validation.error || 'Invalid file');
      }
    }

    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required');
      return;
    }

    setUploading(true);
    try {
      // Upload attachments
      const uploadIds: string[] = [];
      for (const file of attachments) {
        try {
          const result = await uploadFile(file);
          uploadIds.push(result.uploadId);
        } catch (err) {
          console.error('Error uploading file:', err);
          // Continue with other files
        }
      }

      await onSubmit({
        subject: subject.trim(),
        message: message.trim(),
        attachments: uploadIds.length > 0 ? uploadIds : undefined,
      });

      // Reset form
      setSubject('');
      setMessage('');
      setAttachments([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                Create Support Ticket
              </h3>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              {orderId && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
                  Related to Order: {orderId}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="ticket-subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    id="ticket-subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div>
                  <label htmlFor="ticket-message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    id="ticket-message"
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Describe your issue in detail..."
                  />
                </div>

                <div>
                  <label htmlFor="ticket-attachments" className="block text-sm font-medium text-gray-700 mb-1">
                    Attachments (optional)
                  </label>
                  <input
                    id="ticket-attachments"
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    accept="image/*,.pdf"
                  />
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm text-gray-600">
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button
                type="submit"
                variant="primary"
                isLoading={uploading}
                disabled={uploading}
                className="sm:ml-3 sm:w-auto"
              >
                Create Ticket
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mt-3 sm:mt-0 sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


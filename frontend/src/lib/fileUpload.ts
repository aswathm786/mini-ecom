/**
 * File Upload Utilities
 * 
 * Helpers for uploading files to the server.
 */

import { csrfFetch } from './csrfFetch';

export interface UploadResult {
  uploadId: string;
  filename: string;
  url?: string;
}

/**
 * Upload file to server
 */
export async function uploadFile(file: File, endpoint: string = '/api/tickets/upload'): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  // Get CSRF token
  const meta = document.querySelector('meta[name="csrf-token"]');
  const csrfToken = meta?.getAttribute('content');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken || '',
    },
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  const data = await response.json();
  if (data.ok && data.data) {
    return data.data;
  }

  throw new Error('Invalid upload response');
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, maxSize: number = 5 * 1024 * 1024): { valid: boolean; error?: string } {
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  // Check file type (images and PDFs)
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed. Please upload images or PDFs only.',
    };
  }

  return { valid: true };
}


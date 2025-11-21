/**
 * Product Image Uploader Component
 * 
 * Handles product image uploads with preview. Supports both URL links and file uploads.
 */

import { useState, useEffect } from 'react';
import { uploadFile } from '../../lib/fileUpload';

interface ProductImageUploaderProps {
  images?: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export function ProductImageUploader({
  images = [],
  onImagesChange,
  maxImages = 5,
}: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputType, setInputType] = useState<'link' | 'upload'>('upload');
  const [urlInput, setUrlInput] = useState<string>('');

  useEffect(() => {
    // Auto-detect input type based on existing images
    if (images.length > 0) {
      const hasUrl = images.some(img => img.startsWith('http://') || img.startsWith('https://'));
      if (hasUrl) {
        setInputType('link');
      }
    }
  }, [images]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = files.map((file) => uploadFile(file, '/api/admin/products/upload-image'));
      const results = await Promise.all(uploadPromises);
      const newImageUrls = results.map((r) => r.url || r.uploadId);
      onImagesChange([...images, ...newImageUrls]);
      setInputType('upload'); // Switch to upload mode after successful upload
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) {
      setError('Please enter a valid image URL');
      return;
    }

    // Validate URL
    try {
      new URL(urlInput);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    if (images.includes(urlInput.trim())) {
      setError('This image URL is already added');
      return;
    }

    if (images.length >= maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setError(null);
    onImagesChange([...images, urlInput.trim()]);
    setUrlInput('');
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Product Images ({images.length}/{maxImages})
      </label>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <img
                src={imageUrl}
                alt={`Product ${index + 1}`}
                className="w-full h-32 object-cover rounded-md border border-gray-300"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Type Selection */}
      {images.length < maxImages && (
        <div className="space-y-3">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="image-input-type"
                checked={inputType === 'link'}
                onChange={() => setInputType('link')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Use Link/URL</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="image-input-type"
                checked={inputType === 'upload'}
                onChange={() => setInputType('upload')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Upload Image</span>
            </label>
          </div>

          {/* URL Input */}
          {inputType === 'link' && (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
              >
                Add URL
              </button>
            </div>
          )}

          {/* File Upload Input */}
          {inputType === 'upload' && (
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {uploading ? 'Uploading...' : 'Upload Images'}
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/**
 * File Upload Middleware
 * 
 * Configures multer for handling multipart/form-data file uploads.
 * Validates file types and sizes according to Config settings.
 */

import multer from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { Config } from '../config/Config';

// Ensure uploads directory exists
const uploadsDir = Config.get('UPLOAD_DIR', './uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate random filename: timestamp_randomhex.extension
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${timestamp}_${randomHex}${ext}`;
    cb(null, filename);
  },
});

/**
 * File filter for image uploads
 */
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`));
  }
};

/**
 * Multer instance for single image upload
 */
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Config.int('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB default
  },
});

/**
 * Multer instance for multiple image uploads
 */
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Config.int('MAX_FILE_SIZE', 10 * 1024 * 1024),
    files: 5, // Max 5 images per product
  },
});

/**
 * Get public URL for uploaded file
 */
export function getFileUrl(filename: string): string {
  const appUrl = Config.APP_URL;
  const apiUrl = Config.API_URL;
  // Serve via API endpoint
  return `${apiUrl}/uploads/${filename}`;
}


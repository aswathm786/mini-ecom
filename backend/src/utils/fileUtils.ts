/**
 * File Utilities
 * 
 * Helpers for file operations (save, read, delete).
 */

import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../config/Config';

/**
 * Ensure directory exists, create if not
 */
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Save file to storage directory
 */
export function saveFile(
  filename: string,
  content: Buffer | string,
  subdirectory?: string
): string {
  const storagePath = Config.get('STORAGE_PATH', './storage');
  const targetDir = subdirectory
    ? path.join(storagePath, subdirectory)
    : storagePath;
  
  ensureDirectory(targetDir);
  
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, content);
  
  return filePath;
}

/**
 * Read file from storage
 */
export function readFile(filePath: string): Buffer | null {
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
}

/**
 * Delete file
 */
export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Get file URL for serving
 */
export function getFileUrl(filename: string, subdirectory?: string): string {
  const apiUrl = Config.API_URL;
  const pathSegment = subdirectory ? `/${subdirectory}` : '';
  return `${apiUrl}/uploads${pathSegment}/${filename}`;
}


/**
 * Store Settings Model
 * 
 * Defines the structure for store branding settings (name, logo, favicon).
 * This is separate from theme settings as it's used for business branding,
 * not just visual theming.
 */

export interface StoreSettings {
  name?: string;        // Store/site name displayed in navbar, emails, invoices
  logo?: string;        // Store logo URL
  favicon?: string;     // Browser tab icon
  tagline?: string;     // Store tagline/slogan
  link?: string;        // Store website link/URL
  email?: string;       // Store contact email
  phone?: string;       // Store contact phone
  address?: string;     // Store address
  backendStoreName?: string;  // Store name for backend/invoices (fallback)
  invoicePrefix?: string;     // Invoice prefix for invoice numbering
}

export interface StoreSettingsDocument {
  _id?: string;
  key: string;
  value: StoreSettings;
  type: 'json';
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
  createdAt?: Date;
}


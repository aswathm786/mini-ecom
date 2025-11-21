/**
 * Settings Model
 * 
 * Defines the structure for application settings stored in MongoDB.
 * Settings are organized by category (features, site, shipping, etc.)
 */

export interface SettingsDocument {
  _id?: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
  createdAt?: Date;
}

/**
 * Feature Flags Structure
 */
export interface FeatureFlags {
  // Shipping
  deliveryProviders?: {
    delhivery?: {
      enabled: boolean;
      config?: {
        clientId?: string;
        token?: string;
        enabledAt?: Date;
        disabledAt?: Date;
      };
    };
    bluedart?: {
      enabled: boolean;
    };
    dtdc?: {
      enabled: boolean;
    };
  };
  
  // Payments
  payments?: {
    razorpay?: { enabled: boolean };
    cod?: { enabled: boolean };
    wallet?: { enabled: boolean };
  };
  
  // Email
  email?: {
    enabled: boolean;
    marketing?: { enabled: boolean };
    transactional?: { enabled: boolean };
    productLaunch?: { enabled: boolean };
    announcements?: { enabled: boolean };
  };
  
  // Theme
  theme?: {
    enabled: boolean;
  };
  
  // Reviews
  reviews?: {
    enabled: boolean;
    requireModeration?: boolean;
  };
  
  // Wishlist
  wishlist?: {
    enabled: boolean;
  };
  
  // Coupons
  coupons?: {
    enabled: boolean;
    types?: {
      percent?: boolean;
      flat?: boolean;
      bxgy?: boolean;
      firstOrder?: boolean;
    };
  };
  
  // Loyalty
  loyalty?: {
    enabled: boolean;
    rules?: {
      pointsPerRupee?: number;
      redemptionRate?: number;
      minRedeemPoints?: number;
      maxRedeemPercentage?: number;
    };
  };
  
  // Checkout
  checkout?: {
    guestEnabled?: boolean;
  };
  
  // Returns
  returns?: {
    enabled: boolean;
    windowDays?: number;
    autoApprove?: boolean;
  };
  
  // Notifications
  notifications?: {
    webpush?: { enabled: boolean };
  };
  
  // Search
  search?: {
    semantic?: { enabled: boolean };
    autocomplete?: { enabled: boolean };
    trending?: { enabled: boolean };
  };
  
  // Recommendations
  recommendations?: {
    ai?: { enabled: boolean };
  };
  
  // AI
  ai?: {
    chat?: { enabled: boolean };
    admin?: {
      productDescription?: { enabled: boolean };
      emailGenerator?: { enabled: boolean };
      supportReply?: { enabled: boolean };
    };
  };
  
  // Tools
  tools?: {
    bulkImport?: { enabled: boolean };
  };
  
  // Security
  security?: {
    fraud?: {
      enabled: boolean;
      rules?: {
        orderVelocity?: number;
        bannedEmails?: string[];
      };
    };
    adminIpWhitelist?: {
      enabled: boolean;
      ips?: string[];
    };
    '2fa'?: {
      requireForAdmin?: boolean;
      allowForUsers?: boolean;
    };
  };
}

/**
 * Site Settings
 */
export interface SiteSettings {
  maintenance?: {
    enabled: boolean;
    message?: string;
    whitelistIps?: string[];
  };
}

/**
 * Shipping Settings
 */
export interface ShippingSettings {
  providers?: {
    delhivery?: {
      enabled: boolean;
      config?: Record<string, any>;
    };
    bluedart?: {
      enabled: boolean;
      config?: Record<string, any>;
    };
    dtdc?: {
      enabled: boolean;
      config?: Record<string, any>;
    };
  };
}

/**
 * Payment Settings
 */
export interface PaymentSettings {
  methods?: {
    razorpay?: { enabled: boolean };
    cod?: { enabled: boolean };
    wallet?: { enabled: boolean };
  };
}

/**
 * CDN Settings
 */
export interface CDNSettings {
  enabled: boolean;
  provider?: string;
  config?: Record<string, any>;
}

/**
 * Backup Settings
 */
export interface BackupSettings {
  enabled: boolean;
  retentionDays?: number;
}

/**
 * Monitoring Settings
 */
export interface MonitoringSettings {
  enabled: boolean;
  prometheus?: {
    enabled: boolean;
  };
}

/**
 * Privacy Settings
 */
export interface PrivacySettings {
  export?: { enabled: boolean };
  deletion?: { enabled: boolean };
}

/**
 * Complete Settings Structure
 */
export interface AppSettings {
  features?: FeatureFlags;
  site?: SiteSettings;
  shipping?: ShippingSettings;
  payments?: PaymentSettings;
  cdn?: CDNSettings;
  backups?: BackupSettings;
  monitoring?: MonitoringSettings;
  privacy?: PrivacySettings;
}


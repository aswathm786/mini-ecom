export interface PlatformSettings {
  features: {
    wishlist: ToggleSetting;
    coupons: ToggleSetting & {
      types: {
        flat: boolean;
        percent: boolean;
        bxgy: boolean;
      };
    };
    loyalty: ToggleSetting & {
      rules: {
        pointsPerCurrency: number;
        redemptionRate: number;
        minRedeemPoints: number;
        maxRedeemPercent: number;
      };
    };
    checkout: {
      guestEnabled: boolean;
    };
    reviews: {
      enabled: boolean;
      requireModeration: boolean;
    };
    returns: {
      enabled: boolean;
      windowDays: number;
      autoApprove: boolean;
    };
    wishlistToggle: ToggleSetting;
    search: {
      semanticEnabled: boolean;
      autocompleteEnabled: boolean;
      trendingEnabled: boolean;
    };
    recommendations: {
      aiEnabled: boolean;
    };
    ai: {
      chatEnabled: boolean;
      adminTools: {
        productDescription: boolean;
        emailGenerator: boolean;
        supportReply: boolean;
      };
    };
    notifications: {
      webpush: ToggleSetting;
    };
  };
  shipping: {
    providers: {
      delhivery: ProviderSetting;
      [key: string]: ProviderSetting;
    };
  };
  payments: {
    methods: Record<'razorpay' | 'cod' | 'wallet' | string, ToggleSetting>;
  };
  email: {
    enabled: boolean;
    transactional: ToggleSetting;
    marketing: ToggleSetting;
    productLaunch: ToggleSetting;
    announcements: ToggleSetting;
  };
  theme: {
    enabled: boolean;
    activeThemeId: string | null;
    scheduledActivation: {
      themeId: string;
      activateAt: string;
    } | null;
  };
  notifications: {
    webpush: ToggleSetting;
  };
  maintenance: {
    enabled: boolean;
    message: string;
    allowedIps: string[];
  };
  cdn: {
    enabled: boolean;
    provider: string | null;
    config: Record<string, any>;
  };
  backups: {
    enabled: boolean;
    retentionDays: number;
  };
  monitoring: {
    enabled: boolean;
    prometheusEnabled: boolean;
  };
  privacy: {
    exportEnabled: boolean;
    deletionEnabled: boolean;
  };
  security: {
    adminIpWhitelist: {
      enabled: boolean;
      ips: string[];
    };
    twoFactor: {
      requireForAdmins: boolean;
      allowForUsers: boolean;
    };
  };
  tools: {
    bulkImport: ToggleSetting;
  };
  fraud: {
    enabled: boolean;
    orderVelocityThreshold: number;
  };
  auth: {
    google: {
      enabled: boolean;
    };
  };
  taxShipping: {
    taxRate: number; // GST/Tax rate as percentage (e.g., 18 for 18%)
    defaultShippingCost: number; // Default flat shipping cost
    shippingCalculationMethod: 'flat' | 'dynamic'; // 'flat' uses defaultShippingCost, 'dynamic' uses shipping provider
  };
}

export interface ToggleSetting {
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface ProviderSetting extends ToggleSetting {
  enabledAt: string | null;
  disabledAt: string | null;
  config: Record<string, any>;
}


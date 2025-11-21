import { PlatformSettings } from '../types/settings';

export const DEFAULT_SETTINGS: PlatformSettings = {
  features: {
    wishlist: { enabled: true },
    coupons: { enabled: true, types: { flat: true, percent: true, bxgy: true } },
    loyalty: {
      enabled: true,
      rules: {
        pointsPerCurrency: 0.1,
        redemptionRate: 0.1,
        minRedeemPoints: 100,
        maxRedeemPercent: 50,
      },
    },
    checkout: { guestEnabled: true },
    reviews: { enabled: true, requireModeration: false },
    returns: { enabled: true, windowDays: 7, autoApprove: false },
    wishlistToggle: { enabled: true },
    search: { semanticEnabled: true, autocompleteEnabled: true, trendingEnabled: true },
    recommendations: { aiEnabled: true },
    ai: {
      chatEnabled: true,
      adminTools: {
        productDescription: true,
        emailGenerator: true,
        supportReply: true,
      },
    },
    notifications: {
      webpush: { enabled: true },
    },
  },
  shipping: {
    providers: {
      delhivery: {
        enabled: true,
        enabledAt: null,
        disabledAt: null,
        config: {},
      },
    },
  },
  payments: {
    methods: {
      razorpay: { enabled: true },
      cod: { enabled: true },
      wallet: { enabled: false },
    },
  },
  email: {
    enabled: true,
    transactional: { enabled: true },
    marketing: { enabled: true },
    productLaunch: { enabled: true },
    announcements: { enabled: true },
  },
  theme: {
    enabled: true,
    activeThemeId: null,
    scheduledActivation: null,
  },
  notifications: {
    webpush: { enabled: true },
  },
  maintenance: {
    enabled: false,
    message: 'We are performing scheduled maintenance and will be back shortly.',
    allowedIps: [],
  },
  cdn: {
    enabled: false,
    provider: null,
    config: {},
  },
  backups: {
    enabled: true,
    retentionDays: 7,
  },
  monitoring: {
    enabled: true,
    prometheusEnabled: true,
  },
  privacy: {
    exportEnabled: true,
    deletionEnabled: true,
  },
  security: {
    adminIpWhitelist: {
      enabled: false,
      ips: [],
    },
    twoFactor: {
      requireForAdmins: true,
      allowForUsers: true,
    },
  },
  tools: {
    bulkImport: { enabled: true },
  },
  fraud: {
    enabled: false,
    orderVelocityThreshold: 5,
  },
};


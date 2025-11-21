/**
 * Seed Default Settings
 * 
 * Initializes default feature flags and settings in MongoDB.
 * Run this script after initial database setup.
 */

import { mongo } from '../backend/src/db/Mongo';
import { settingsService } from '../backend/src/services/SettingsService';

const DEFAULT_FEATURE_FLAGS = {
  // Shipping
  deliveryProviders: {
    delhivery: {
      enabled: true,
    },
    bluedart: {
      enabled: false,
    },
    dtdc: {
      enabled: false,
    },
  },
  
  // Payments
  payments: {
    razorpay: { enabled: true },
    cod: { enabled: true },
    wallet: { enabled: false },
  },
  
  // Email
  email: {
    enabled: true,
    marketing: { enabled: true },
    transactional: { enabled: true }, // Always enabled
    productLaunch: { enabled: true },
    announcements: { enabled: true },
  },
  
  // Theme
  theme: {
    enabled: true,
  },
  
  // Reviews
  reviews: {
    enabled: true,
    requireModeration: false,
  },
  
  // Wishlist
  wishlist: {
    enabled: true,
  },
  
  // Coupons
  coupons: {
    enabled: true,
    types: {
      percent: true,
      flat: true,
      bxgy: true,
      firstOrder: true,
    },
  },
  
  // Loyalty
  loyalty: {
    enabled: true,
    rules: {
      pointsPerRupee: 1,
      redemptionRate: 100, // 100 points = 1 rupee
      minRedeemPoints: 100,
      maxRedeemPercentage: 50, // Max 50% of order
    },
  },
  
  // Checkout
  checkout: {
    guestEnabled: true,
  },
  
  // Returns
  returns: {
    enabled: true,
    windowDays: 7,
    autoApprove: false,
  },
  
  // Notifications
  notifications: {
    webpush: { enabled: true },
  },
  
  // Search
  search: {
    semantic: { enabled: true },
    autocomplete: { enabled: true },
    trending: { enabled: true },
  },
  
  // Recommendations
  recommendations: {
    ai: { enabled: true },
  },
  
  // AI
  ai: {
    chat: { enabled: true },
    admin: {
      productDescription: { enabled: true },
      emailGenerator: { enabled: true },
      supportReply: { enabled: true },
    },
  },
  
  // Tools
  tools: {
    bulkImport: { enabled: true },
  },
  
  // Security
  security: {
    fraud: {
      enabled: false,
      rules: {
        orderVelocity: 10, // Max 10 orders per hour
        bannedEmails: [],
      },
    },
    adminIpWhitelist: {
      enabled: false,
      ips: [],
    },
    '2fa': {
      requireForAdmin: false,
      allowForUsers: true,
    },
  },
};

const DEFAULT_SITE_SETTINGS = {
  maintenance: {
    enabled: false,
    message: 'We are currently performing maintenance. Please check back soon.',
    whitelistIps: [],
  },
};

const DEFAULT_CDN_SETTINGS = {
  enabled: false,
  provider: '',
  config: {},
};

const DEFAULT_BACKUP_SETTINGS = {
  enabled: false,
  retentionDays: 30,
};

const DEFAULT_MONITORING_SETTINGS = {
  enabled: false,
  prometheus: {
    enabled: false,
  },
};

const DEFAULT_PRIVACY_SETTINGS = {
  export: { enabled: true },
  deletion: { enabled: true },
};

async function seedSettings() {
  try {
    console.log('Connecting to MongoDB...');
    await mongo.connect();
    console.log('Connected to MongoDB');

    // Seed feature flags
    console.log('Seeding feature flags...');
    await settingsService.setSetting('features', DEFAULT_FEATURE_FLAGS, 'json', 'Feature flags');
    console.log('✓ Feature flags seeded');

    // Seed site settings
    console.log('Seeding site settings...');
    await settingsService.setSetting('site', DEFAULT_SITE_SETTINGS, 'json', 'Site settings');
    console.log('✓ Site settings seeded');

    // Seed shipping settings
    console.log('Seeding shipping settings...');
    await settingsService.setSetting('shipping', {
      providers: DEFAULT_FEATURE_FLAGS.deliveryProviders,
    }, 'json', 'Shipping provider settings');
    console.log('✓ Shipping settings seeded');

    // Seed payment settings
    console.log('Seeding payment settings...');
    await settingsService.setSetting('payments', {
      methods: DEFAULT_FEATURE_FLAGS.payments,
    }, 'json', 'Payment method settings');
    console.log('✓ Payment settings seeded');

    // Seed CDN settings
    console.log('Seeding CDN settings...');
    await settingsService.setSetting('cdn', DEFAULT_CDN_SETTINGS, 'json', 'CDN settings');
    console.log('✓ CDN settings seeded');

    // Seed backup settings
    console.log('Seeding backup settings...');
    await settingsService.setSetting('backups', DEFAULT_BACKUP_SETTINGS, 'json', 'Backup settings');
    console.log('✓ Backup settings seeded');

    // Seed monitoring settings
    console.log('Seeding monitoring settings...');
    await settingsService.setSetting('monitoring', DEFAULT_MONITORING_SETTINGS, 'json', 'Monitoring settings');
    console.log('✓ Monitoring settings seeded');

    // Seed privacy settings
    console.log('Seeding privacy settings...');
    await settingsService.setSetting('privacy', DEFAULT_PRIVACY_SETTINGS, 'json', 'Privacy settings');
    console.log('✓ Privacy settings seeded');

    // Reload settings
    await settingsService.loadSettings();
    console.log('✓ Settings reloaded');

    console.log('\n✅ All settings seeded successfully!');
  } catch (error) {
    console.error('Error seeding settings:', error);
    process.exit(1);
  } finally {
    await mongo.disconnect();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  seedSettings();
}

export { seedSettings };

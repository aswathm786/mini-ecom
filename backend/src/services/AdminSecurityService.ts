import { mongo } from '../db/Mongo';
import { Config } from '../config/Config';

interface AdminIpWhitelistSetting {
  enabled: boolean;
  ips: string[];
  updatedAt?: Date;
}

const WHITELIST_CACHE_TTL = 60 * 1000;

class AdminSecurityService {
  private whitelistCache: { value: AdminIpWhitelistSetting; expiresAt: number } | null = null;

  async getAdminIpWhitelist(): Promise<AdminIpWhitelistSetting> {
    if (this.whitelistCache && this.whitelistCache.expiresAt > Date.now()) {
      return this.whitelistCache.value;
    }

    const db = mongo.getDb();
    const settingsCollection = db.collection('settings');
    const record = await settingsCollection.findOne({ key: 'security.adminIpWhitelist' });

    let config: AdminIpWhitelistSetting = {
      enabled: Config.bool('ADMIN_IP_WHITELIST_ENABLED', false),
      ips: [],
    };

    if (record?.value) {
      try {
        config = {
          enabled: Boolean(record.value.enabled),
          ips: Array.isArray(record.value.ips) ? record.value.ips.map(String) : [],
          updatedAt: record.updatedAt,
        };
      } catch (error) {
        console.warn('Admin whitelist config parse error', error);
      }
    } else {
      const envList = Config.get('ADMIN_IP_WHITELIST', '');
      if (envList) {
        config.ips = envList.split(',').map((ip: string) => ip.trim()).filter(Boolean);
      }
    }

    this.whitelistCache = {
      value: config,
      expiresAt: Date.now() + WHITELIST_CACHE_TTL,
    };

    return config;
  }

  async updateWhitelist(config: AdminIpWhitelistSetting): Promise<void> {
    const db = mongo.getDb();
    const settingsCollection = db.collection('settings');

    await settingsCollection.updateOne(
      { key: 'security.adminIpWhitelist' },
      {
        $set: {
          key: 'security.adminIpWhitelist',
          value: config,
          type: 'json',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    this.whitelistCache = null;
  }
}

export const adminSecurityService = new AdminSecurityService();


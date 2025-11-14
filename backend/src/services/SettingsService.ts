/**
 * Settings Service
 *
 * Loads runtime settings from MongoDB `settings` collection.
 * These settings override .env values at runtime.
 *
 * Settings are loaded at server startup and merged into Config.
 */

import { Db } from "mongodb";
import { mongo } from "../db/Mongo";
import { setRuntimeSettings } from "../config/Config";
import { Setting } from "../types";

class SettingsService {
  /**
   * Load all settings from database and merge into Config
   * This should be called at server startup after MongoDB connection
   */
  async loadSettings(): Promise<void> {
    try {
      const db = mongo.getDb();
      const settingsCollection = db.collection<Setting>("settings");

      const settings = await settingsCollection.find({}).toArray();

      // Convert settings array to Map<string, any>
      const settingsMap = new Map<string, any>();

      for (const setting of settings) {
        let value: any = setting.value;

        // Convert value based on type
        if (setting.type === "number") {
          value = typeof value === "number" ? value : parseFloat(String(value));
        } else if (setting.type === "boolean") {
          value =
            typeof value === "boolean"
              ? value
              : String(value).toLowerCase() === "true";
        } else if (setting.type === "json") {
          value = typeof value === "string" ? JSON.parse(value) : value;
        }

        settingsMap.set(setting.key, value);
      }

      // Merge into Config
      setRuntimeSettings(settingsMap);

      if (settings.length > 0) {
        console.log(
          `✓ Loaded ${settings.length} runtime settings from database`
        );
      }
    } catch (error) {
      console.error("Failed to load settings from database:", error);
      // Don't throw - continue with .env values only
    }
  }

  /**
   * Get a setting value by key
   */
  async getSetting(key: string): Promise<any> {
    const db = mongo.getDb();
    const settingsCollection = db.collection<Setting>("settings");
    const setting = await settingsCollection.findOne({ key });
    return setting?.value;
  }

  /**
   * Set a setting value (for admin panel use later)
   */
  async setSetting(
    key: string,
    value: any,
    type: "string" | "number" | "boolean" | "json" = "string",
    description?: string
  ): Promise<void> {
    const db = mongo.getDb();
    const settingsCollection = db.collection<Setting>("settings");

    await settingsCollection.updateOne(
      { key },
      {
        $set: {
          key,
          value: type === "json" ? JSON.stringify(value) : value,
          type,
          description,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Reload settings to update runtime config
    await this.loadSettings();
  }
}

export const settingsService = new SettingsService();

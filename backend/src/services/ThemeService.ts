import { ObjectId } from 'mongodb';
import { mongo } from '../db/Mongo';
import { Theme } from '../types';

const ACTIVATION_CHECK_WINDOW_MS = 60 * 1000;

class ThemeService {
  private lastActivationCheck = 0;

  async listThemes(): Promise<Theme[]> {
    const db = mongo.getDb();
    return db.collection<Theme>('themes').find({}).sort({ updatedAt: -1 }).toArray();
  }

  async createTheme(theme: Omit<Theme, '_id' | 'isActive' | 'isArchived' | 'createdAt' | 'updatedAt'>): Promise<Theme> {
    const db = mongo.getDb();
    const now = new Date();
    const doc: Theme = {
      ...theme,
      isActive: false,
      isArchived: false,
      scheduledAt: theme.scheduledAt ? new Date(theme.scheduledAt) : null,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<Theme>('themes').insertOne(doc);
    doc._id = result.insertedId.toString();
    return doc;
  }

  async updateTheme(themeId: string, updates: Partial<Theme>): Promise<Theme | null> {
    const db = mongo.getDb();
    const _id = new ObjectId(themeId);
    const payload = { ...updates, updatedAt: new Date() };
    await db.collection<Theme>('themes').updateOne({ _id } as any, { $set: payload });
    return db.collection<Theme>('themes').findOne({ _id } as any);
  }

  async publishTheme(themeId: string): Promise<void> {
    const db = mongo.getDb();
    const _id = new ObjectId(themeId);
    await db.collection<Theme>('themes').updateMany({}, { $set: { isActive: false } });
    await db
      .collection<Theme>('themes')
      .updateOne({ _id } as any, { $set: { isActive: true, scheduledAt: null, updatedAt: new Date() } });
  }

  async scheduleTheme(themeId: string, date: Date): Promise<void> {
    const db = mongo.getDb();
    const _id = new ObjectId(themeId);
    await db
      .collection<Theme>('themes')
      .updateOne({ _id } as any, { $set: { scheduledAt: date, isActive: false, updatedAt: new Date() } });
  }

  async getActiveTheme(): Promise<Theme | null> {
    const db = mongo.getDb();
    await this.activateScheduledThemes();
    const theme = await db.collection<Theme>('themes').findOne({ isActive: true });
    return theme;
  }

  async deleteTheme(themeId: string): Promise<boolean> {
    const db = mongo.getDb();
    const _id = new ObjectId(themeId);
    const result = await db.collection<Theme>('themes').deleteOne({ _id } as any);
    return result.deletedCount > 0;
  }

  private async activateScheduledThemes(): Promise<void> {
    if (this.lastActivationCheck > Date.now() - ACTIVATION_CHECK_WINDOW_MS) {
      return;
    }
    this.lastActivationCheck = Date.now();

    const db = mongo.getDb();
    const dueTheme = await db
      .collection<Theme>('themes')
      .findOne({ scheduledAt: { $lte: new Date() }, isArchived: false } as any);

    if (dueTheme) {
      await this.publishTheme(dueTheme._id!.toString());
    }
  }
}

export const themeService = new ThemeService();



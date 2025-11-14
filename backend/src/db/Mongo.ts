/**
 * MongoDB connection helper
 * 
 * Provides a singleton MongoDB client and database instance.
 * Handles connection, reconnection, and graceful shutdown.
 */

import { MongoClient, Db } from 'mongodb';
import { Config } from '../config/Config';

class Mongo {
  private static instance: Mongo;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnecting: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): Mongo {
    if (!Mongo.instance) {
      Mongo.instance = new Mongo();
    }
    return Mongo.instance;
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    if (this.db) {
      return; // Already connected
    }

    if (this.isConnecting) {
      // Wait for ongoing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isConnecting = true;

    try {
      const uri = Config.MONGODB_URI;
      
      console.log('Connecting to MongoDB...');
      console.log(`MongoDB URI: ${uri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials

      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });

      await this.client.connect();
      
      // Extract database name from URI or use default
      const dbName = this.extractDbName(uri) || 'handmade_harmony';
      this.db = this.client.db(dbName);

      // Test connection
      await this.db.admin().ping();
      
      console.log(`✓ Connected to MongoDB database: ${dbName}`);
      
      // Set up connection event handlers
      this.client.on('error', (error) => {
        console.error('MongoDB client error:', error);
      });

      this.client.on('close', () => {
        console.warn('MongoDB connection closed');
        this.db = null;
      });

    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      this.client = null;
      this.db = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Get database instance
   */
  getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Get MongoDB client
   */
  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.db !== null && this.client !== null;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('MongoDB connection closed');
    }
  }

  /**
   * Extract database name from MongoDB URI
   */
  private extractDbName(uri: string): string | null {
    try {
      const url = new URL(uri);
      const pathname = url.pathname;
      if (pathname && pathname.length > 1) {
        return pathname.substring(1).split('?')[0];
      }
    } catch (error) {
      // Invalid URI format, return null
    }
    return null;
  }
}

// Export singleton instance
export const mongo = Mongo.getInstance();


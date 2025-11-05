import { createClient, RedisClientType } from 'redis';

export class CacheService {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DB || '0'),
    });

    // Handle connection events
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.connected = true;
    });

    this.client.on('ready', () => {
      console.log('Redis Client Ready');
      this.connected = true;
    });

    this.client.on('end', () => {
      console.log('Redis Client Disconnected');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.connected) {
        console.warn('Redis not connected, skipping cache get');
        return null;
      }

      const value = await this.client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.connected) {
        console.warn('Redis not connected, skipping cache set');
        return false;
      }

      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.connected) {
        console.warn('Redis not connected, skipping cache delete');
        return false;
      }

      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.connected) {
        return false;
      }

      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async clear(pattern?: string): Promise<number> {
    try {
      if (!this.connected) {
        console.warn('Redis not connected, skipping cache clear');
        return 0;
      }

      let deletedCount = 0;

      if (pattern) {
        // Delete keys matching pattern
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          deletedCount = await this.client.del(keys);
        }
      } else {
        // Clear all keys
        await this.client.flushDb();
        deletedCount = -1; // Indicate full flush
      }

      return deletedCount;
    } catch (error) {
      console.error('Cache clear error:', error);
      return 0;
    }
  }

  async setHash(key: string, field: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.connected) {
        console.warn('Redis not connected, skipping hash set');
        return false;
      }

      const serialized = JSON.stringify(value);
      await this.client.hSet(key, field, serialized);

      if (ttlSeconds) {
        await this.client.expire(key, ttlSeconds);
      }

      return true;
    } catch (error) {
      console.error('Cache hash set error:', error);
      return false;
    }
  }

  async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      if (!this.connected) {
        console.warn('Redis not connected, skipping hash get');
        return null;
      }

      const value = await this.client.hGet(key, field);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache hash get error:', error);
      return null;
    }
  }

  async getAllHash<T>(key: string): Promise<Record<string, T> | null> {
    try {
      if (!this.connected) {
        console.warn('Redis not connected, skipping hash get all');
        return null;
      }

      const hashData = await this.client.hGetAll(key);
      if (!hashData || Object.keys(hashData).length === 0) return null;

      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(hashData)) {
        try {
          result[field] = JSON.parse(value) as T;
        } catch (parseError) {
          console.error(`Error parsing hash field ${field}:`, parseError);
        }
      }

      return result;
    } catch (error) {
      console.error('Cache hash get all error:', error);
      return null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Cache key helpers
  static generateKey(prefix: string, ...identifiers: string[]): string {
    return `${prefix}:${identifiers.join(':')}`;
  }

  // Common cache TTL values (in seconds)
  static readonly TTL = {
    MINUTE: 60,
    FIVE_MINUTES: 300,
    FIFTEEN_MINUTES: 900,
    HOUR: 3600,
    DAY: 86400,
    WEEK: 604800,
  } as const;
}

// Create a singleton instance
export const cacheService = new CacheService();

// Cache key prefixes for different data types
export const CacheKeys = {
  USER: 'user',
  VENTURE: 'venture',
  VENTURE_MEMBERS: 'venture_members',
  VENTURE_STATS: 'venture_stats',
  CONVERSATIONS: 'conversations',
  CONTENT_DRAFTS: 'content_drafts',
  SOCIAL_ACCOUNTS: 'social_accounts',
  AI_RESPONSES: 'ai_responses',
  DASHBOARD_METRICS: 'dashboard_metrics',
  FINANCIAL_DATA: 'financial_data',
} as const;
import { Pool } from 'pg';

export class Database {
  public pool: Pool | null = null;

  private initializePool() {
    if (!this.pool) {
      console.log('Database initializing - DB_USER:', process.env.DB_USER);
      console.log('Database initializing - DB_PASSWORD:', process.env.DB_PASSWORD);
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'collective_strategist',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || (process.env.DB_USER === 'alyssapowell' ? undefined : 'postgres'),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
    return this.pool;
  }

  get poolInstance() {
    return this.initializePool();
  }

  async query(text: string, params?: any[]) {
    const pool = this.initializePool();
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async getClient() {
    const pool = this.initializePool();
    return pool.connect();
  }

  async close() {
    const pool = this.initializePool();
    await pool.end();
  }
}

export const db = new Database();
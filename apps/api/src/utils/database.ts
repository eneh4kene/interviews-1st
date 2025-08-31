import { Pool, PoolClient } from 'pg';
import { createClient } from 'redis';

// PostgreSQL connection pool
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jobplace',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Redis client - REPLIT FIX
let redisClient: any = null;

if (process.env.REDIS_URL) {
    // Use external Redis if URL provided
    redisClient = createClient({
        url: process.env.REDIS_URL,
    });
    redisClient.connect().catch(console.error);
} else {
    // Mock Redis for Replit
    console.log('⚠️ Using mock Redis for Replit');
    const mockRedis = new Map<string, { value: any; expiresAt?: number }>();

    redisClient = {
        set: async (key: string, value: string, expireSeconds?: number) => {
            const expiresAt = expireSeconds ? Date.now() + (expireSeconds * 1000) : undefined;
            mockRedis.set(key, { value, expiresAt });
            return 'OK';
        },
        get: async (key: string) => {
            const item = mockRedis.get(key);
            if (!item) return null;

            // Check expiration
            if (item.expiresAt && Date.now() > item.expiresAt) {
                mockRedis.delete(key);
                return null;
            }

            return item.value;
        },
        del: async (key: string) => mockRedis.delete(key) ? 1 : 0,
        exists: async (key: string) => {
            const item = mockRedis.get(key);
            if (!item) return 0;

            if (item.expiresAt && Date.now() > item.expiresAt) {
                mockRedis.delete(key);
                return 0;
            }

            return 1;
        },
        on: () => { }, // Mock event handlers
    };
}

// Handle Redis connection events
redisClient.on?.('error', (err: any) => {
    console.error('Redis Client Error:', err);
});

redisClient.on?.('connect', () => {
    console.log('✅ Connected to Redis');
});

// Handle PostgreSQL connection events
pgPool.on('connect', (client) => {
    console.log('✅ Connected to PostgreSQL');
});

pgPool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

// Database utility functions
export const db = {
    // Execute a query with parameters
    query: async (text: string, params?: any[]) => {
        const start = Date.now();
        try {
            const res = await pgPool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },

    // Get a client from the pool for transactions
    getClient: async (): Promise<PoolClient> => {
        return await pgPool.connect();
    },

    // Execute a transaction
    transaction: async (callback: (client: PoolClient) => Promise<any>) => {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
};

// Redis utility functions
export const redis = {
    // Set a key with optional expiration
    set: async (key: string, value: string, expireSeconds?: number) => {
        if (expireSeconds) {
            return await redisClient.setEx(key, expireSeconds, value);
        }
        return await redisClient.set(key, value);
    },

    // Get a value by key
    get: async (key: string) => {
        return await redisClient.get(key);
    },

    // Delete a key
    del: async (key: string) => {
        return await redisClient.del(key);
    },

    // Check if a key exists
    exists: async (key: string) => {
        return await redisClient.exists(key);
    },

    // Set expiration on a key
    expire: async (key: string, seconds: number) => {
        return await redisClient.expire(key, seconds);
    },

    // Get all keys matching a pattern
    keys: async (pattern: string) => {
        return await redisClient.keys(pattern);
    },
};

// Health check function
export const checkDatabaseHealth = async () => {
    try {
        // Check PostgreSQL
        await pgPool.query('SELECT 1');

        // Check Redis
        await redisClient.ping();

        return { status: 'healthy', postgres: 'connected', redis: 'connected' };
    } catch (error) {
        console.error('Database health check failed:', error);
        return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
};

// Graceful shutdown
export const closeConnections = async () => {
    console.log('Closing database connections...');
    await pgPool.end();
    await redisClient.quit();
    console.log('Database connections closed');
};

// Handle process termination
process.on('SIGINT', closeConnections);
process.on('SIGTERM', closeConnections); 
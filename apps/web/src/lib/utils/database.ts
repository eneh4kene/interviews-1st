import { Pool, PoolClient } from 'pg';
import { createClient } from 'redis';
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// console.log('Database URL:', process.env.DATABASE_URL);
// console.log('Redis URL:', process.env.REDIS_URL);

// Only check DATABASE_URL when actually connecting, not during build
// if (!process.env.DATABASE_URL) {
//     throw new Error('DATABASE_URL is not set');
// }

// PostgreSQL connection pool
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/jobplace',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Function to validate database connection
export async function validateDatabaseConnection(): Promise<void> {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set');
    }

    try {
        const client = await pgPool.connect();
        await client.query('SELECT 1');
        client.release();
    } catch (error) {
        throw new Error(`Database connection failed: ${error}`);
    }
}

// Redis client - REPLIT FIX
let redisClient: any = null;

if (process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379') {
    // Use external Redis if URL provided and not localhost
    try {
        redisClient = createClient({
            url: process.env.REDIS_URL,
        });
        redisClient.connect().catch((error: any) => {
            console.log('⚠️ Redis connection failed, falling back to mock Redis:', error.message);
            redisClient = createMockRedis();
        });
    } catch (error) {
        console.log('⚠️ Redis connection failed, falling back to mock Redis');
        redisClient = createMockRedis();
    }
} else {
    // Mock Redis for local development
    console.log('⚠️ Using mock Redis (no external Redis available)');
    redisClient = createMockRedis();
}

function createMockRedis() {
    const mockRedis = new Map<string, { value: any; expiresAt?: number }>();

    return {
        set: async (key: string, value: string, expireSeconds?: number) => {
            const expiresAt = expireSeconds ? Date.now() + (expireSeconds * 1000) : undefined;
            mockRedis.set(key, { value, expiresAt });
            return 'OK';
        },
        setEx: async (key: string, expireSeconds: number, value: string) => {
            const expiresAt = Date.now() + (expireSeconds * 1000);
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
        quit: async () => { return 'OK'; }, // Mock quit method
        ping: async () => 'PONG', // Mock ping method
        disconnect: async () => { return 'OK'; }, // Mock disconnect method
    };
}

// Handle Redis connection events only for real Redis clients
if (process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379') {
    redisClient.on?.('error', (err: any) => {
        console.error('Redis Client Error:', err);
    });

    redisClient.on?.('connect', () => {
        console.log('✅ Connected to Redis');
    });
}

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
        // Validate database connection first
        await validateDatabaseConnection();

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
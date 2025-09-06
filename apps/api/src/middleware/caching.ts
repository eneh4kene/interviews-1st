import { Request, Response, NextFunction } from 'express';
import { redis } from '../utils/database';
import { logger } from './logging';

// Cache configuration
interface CacheConfig {
    ttl: number; // Time to live in seconds
    keyGenerator?: (req: Request) => string;
    skipCache?: (req: Request) => boolean;
    varyByHeaders?: string[];
}

// Default cache key generator
const defaultKeyGenerator = (req: Request): string => {
    const baseKey = `${req.method}:${req.path}`;
    const queryString = new URLSearchParams(req.query as any).toString();
    const userId = (req as any).user?.userId || 'anonymous';
    return `${baseKey}:${userId}:${queryString}`;
};

// Cache middleware factory
export const createCacheMiddleware = (config: CacheConfig) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Skip caching for certain conditions
        if (config.skipCache && config.skipCache(req)) {
            return next();
        }

        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Skip caching if Redis is not available
        if (!redis) {
            return next();
        }

        try {
            // Generate cache key
            let cacheKey = config.keyGenerator 
                ? config.keyGenerator(req)
                : defaultKeyGenerator(req);

            // Add header variations to cache key
            if (config.varyByHeaders) {
                const headerValues = config.varyByHeaders
                    .map(header => req.headers[header.toLowerCase()] || '')
                    .join(':');
                cacheKey = cacheKey + `:${headerValues}`;
            }

            // Try to get cached response
            const cachedResponse = await redis.get(cacheKey);
            
            if (cachedResponse) {
                logger.debug('Cache hit', {
                    requestId: (req as any).id,
                    metadata: { cacheKey },
                    path: req.path
                });

                // Parse and send cached response
                const { data, headers, statusCode } = JSON.parse(cachedResponse);
                
                // Set headers
                Object.entries(headers).forEach(([key, value]) => {
                    res.setHeader(key, value as string);
                });
                
                // Set cache hit header
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('X-Cache-Key', cacheKey);
                
                return res.status(statusCode).json(data);
            }

            // Cache miss - intercept response
            const originalSend = res.send;
            const originalJson = res.json;
            let responseData: any;
            let responseHeaders: Record<string, string> = {};
            let responseStatusCode: number;

            // Intercept res.json
            res.json = function(data: any) {
                responseData = data;
                responseStatusCode = res.statusCode;
                
                // Capture headers
                res.getHeaderNames().forEach(name => {
                    const value = res.getHeader(name);
                    if (typeof value === 'string') {
                        responseHeaders[name] = value;
                    }
                });

                // Cache the response
                const cacheData = {
                    data,
                    headers: responseHeaders,
                    statusCode: responseStatusCode,
                    timestamp: new Date().toISOString()
                };

                // Store in cache asynchronously
                redis.set(cacheKey, JSON.stringify(cacheData), config.ttl)
                    .then(() => {
                        logger.debug('Response cached', {
                            requestId: (req as any).id,
                            metadata: { cacheKey, ttl: config.ttl },
                            path: req.path
                        });
                    })
                    .catch(error => {
                        logger.warn('Failed to cache response', {
                            requestId: (req as any).id,
                            metadata: { cacheKey, error: error.message },
                            path: req.path
                        });
                    });

                // Set cache miss header
                res.setHeader('X-Cache', 'MISS');
                res.setHeader('X-Cache-Key', cacheKey);
                
                return originalJson.call(this, data);
            };

            // Intercept res.send
            res.send = function(data: any) {
                responseData = data;
                responseStatusCode = res.statusCode;
                
                // Capture headers
                res.getHeaderNames().forEach(name => {
                    const value = res.getHeader(name);
                    if (typeof value === 'string') {
                        responseHeaders[name] = value;
                    }
                });

                // Cache the response
                const cacheData = {
                    data,
                    headers: responseHeaders,
                    statusCode: responseStatusCode,
                    timestamp: new Date().toISOString()
                };

                // Store in cache asynchronously
                redis.set(cacheKey, JSON.stringify(cacheData), config.ttl)
                    .then(() => {
                        logger.debug('Response cached', {
                            requestId: (req as any).id,
                            metadata: { cacheKey, ttl: config.ttl },
                            path: req.path
                        });
                    })
                    .catch(error => {
                        logger.warn('Failed to cache response', {
                            requestId: (req as any).id,
                            metadata: { cacheKey, error: error.message },
                            path: req.path
                        });
                    });

                // Set cache miss header
                res.setHeader('X-Cache', 'MISS');
                res.setHeader('X-Cache-Key', cacheKey);
                
                return originalSend.call(this, data);
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error', {
                requestId: (req as any).id,
                error: error instanceof Error ? error.message : 'Unknown error',
                path: req.path
            });
            
            // Continue without caching on error
            next();
        }
    };
};

// Predefined cache configurations
export const cacheConfigs = {
    // Short cache for frequently accessed data
    short: { ttl: 60 }, // 1 minute
    
    // Medium cache for moderately changing data
    medium: { ttl: 300 }, // 5 minutes
    
    // Long cache for relatively static data
    long: { ttl: 1800 }, // 30 minutes
    
    // Very long cache for static data
    veryLong: { ttl: 3600 }, // 1 hour
    
    // User-specific cache
    userSpecific: {
        ttl: 300,
        keyGenerator: (req: Request) => {
            const userId = (req as any).user?.userId || 'anonymous';
            return `user:${userId}:${req.method}:${req.path}`;
        }
    },
    
    // Skip cache for authenticated requests
    skipAuth: {
        ttl: 300,
        skipCache: (req: Request) => {
            return !!(req as any).user;
        }
    }
};

// Cache invalidation utilities
export const cacheUtils = {
    // Invalidate cache by pattern
    invalidatePattern: async (pattern: string) => {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await Promise.all(keys.map((key: string) => redis.del(key)));
                logger.info('Cache invalidated', { metadata: { pattern, keysCount: keys.length } });
            }
        } catch (error) {
            logger.error('Cache invalidation failed', {
                metadata: { pattern },
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    
    // Invalidate user-specific cache
    invalidateUserCache: async (userId: string) => {
        await cacheUtils.invalidatePattern(`user:${userId}:*`);
    },
    
    // Invalidate API endpoint cache
    invalidateEndpoint: async (method: string, path: string) => {
        await cacheUtils.invalidatePattern(`${method}:${path}:*`);
    },
    
    // Clear all cache
    clearAll: async () => {
        await cacheUtils.invalidatePattern('*');
    }
};

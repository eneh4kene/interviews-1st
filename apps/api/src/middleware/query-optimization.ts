import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';

// Query optimization middleware
export const queryOptimization = (req: Request, res: Response, next: NextFunction) => {
    // Add query optimization headers
    res.setHeader('X-Query-Optimized', 'true');
    
    // Log slow queries
    const startTime = Date.now();
    
    // Override res.end to measure query time
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
        const queryTime = Date.now() - startTime;
        
        // Log slow queries (> 1000ms)
        if (queryTime > 1000) {
            logger.warn('Slow query detected', {
                requestId: (req as any).id,
                method: req.method,
                path: req.path,
                metadata: { queryTime },
                statusCode: res.statusCode
            });
        }
        
        // Add query time header
        res.setHeader('X-Query-Time', queryTime.toString());
        
        return originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

// Database connection pooling optimization
export const optimizeDatabaseQueries = {
    // Add query hints for better performance
    addQueryHints: (query: string): string => {
        // Add EXPLAIN ANALYZE for development
        if (process.env.NODE_ENV === 'development') {
            return `EXPLAIN ANALYZE ${query}`;
        }
        return query;
    },
    
    // Optimize SELECT queries
    optimizeSelect: (query: string): string => {
        // Add LIMIT if not present and query looks like it could return many rows
        if (!query.toLowerCase().includes('limit') && 
            query.toLowerCase().includes('select') && 
            !query.toLowerCase().includes('count(')) {
            return `${query} LIMIT 1000`;
        }
        return query;
    },
    
    // Add indexes suggestions
    suggestIndexes: (query: string): string[] => {
        const suggestions: string[] = [];
        
        // Check for WHERE clauses that could benefit from indexes
        const whereMatch = query.match(/WHERE\s+(\w+)\s*=/gi);
        if (whereMatch) {
            whereMatch.forEach(match => {
                const column = match.replace(/WHERE\s+/i, '').replace(/\s*=.*/, '');
                suggestions.push(`Consider adding index on ${column}`);
            });
        }
        
        // Check for ORDER BY clauses
        const orderByMatch = query.match(/ORDER BY\s+(\w+)/gi);
        if (orderByMatch) {
            orderByMatch.forEach(match => {
                const column = match.replace(/ORDER BY\s+/i, '');
                suggestions.push(`Consider adding index on ${column} for ORDER BY`);
            });
        }
        
        return suggestions;
    }
};

// Query result caching
export const queryResultCache = {
    // Cache query results
    cacheResult: async (query: string, params: any[], result: any, ttl: number = 300) => {
        try {
            const { redis } = await import('../utils/database');
            if (!redis) return;
            
            const cacheKey = `query:${Buffer.from(query).toString('base64')}:${JSON.stringify(params)}`;
            await redis.set(cacheKey, JSON.stringify(result), ttl);
            
            logger.debug('Query result cached', {
                metadata: { cacheKey, ttl, resultSize: JSON.stringify(result).length }
            });
        } catch (error) {
            logger.warn('Failed to cache query result', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    },
    
    // Get cached query result
    getCachedResult: async (query: string, params: any[]): Promise<any | null> => {
        try {
            const { redis } = await import('../utils/database');
            if (!redis) return null;
            
            const cacheKey = `query:${Buffer.from(query).toString('base64')}:${JSON.stringify(params)}`;
            const cached = await redis.get(cacheKey);
            
            if (cached) {
                logger.debug('Query result cache hit', { metadata: { cacheKey } });
                return JSON.parse(cached);
            }
            
            return null;
        } catch (error) {
            logger.warn('Failed to get cached query result', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    },
    
    // Invalidate query cache
    invalidateCache: async (pattern: string) => {
        try {
            const { redis } = await import('../utils/database');
            if (!redis) return;
            
            const keys = await redis.keys(`query:${pattern}`);
            if (keys.length > 0) {
                await Promise.all(keys.map((key: string) => redis.del(key)));
                logger.info('Query cache invalidated', { metadata: { pattern, keysCount: keys.length } });
            }
        } catch (error) {
            logger.warn('Failed to invalidate query cache', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};

// Database performance monitoring
export const dbPerformanceMonitor = {
    // Track query performance
    trackQuery: (query: string, duration: number, rowCount: number) => {
        logger.info('Database query executed', {
            metadata: {
                query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
                duration,
                rowCount,
                performance: duration < 100 ? 'fast' : duration < 500 ? 'medium' : 'slow'
            }
        });
    },
    
    // Track connection pool usage
    trackConnectionPool: (active: number, idle: number, total: number) => {
        logger.debug('Database connection pool status', {
            metadata: {
                active,
                idle,
                total,
                utilization: (active / total * 100).toFixed(2) + '%'
            }
        });
    }
};

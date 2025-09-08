import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';

// Performance metrics interface
interface PerformanceMetrics {
    requestId: string;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    timestamp: string;
}

// Metrics collection
class MetricsCollector {
    private metrics: PerformanceMetrics[] = [];
    private maxMetrics = 1000; // Keep last 1000 requests

    addMetric(metric: PerformanceMetrics) {
        this.metrics.push(metric);
        
        // Keep only the last maxMetrics entries
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
    }

    getMetrics() {
        return {
            total: this.metrics.length,
            averageResponseTime: this.calculateAverageResponseTime(),
            slowestRequests: this.getSlowestRequests(5),
            statusCodeDistribution: this.getStatusCodeDistribution(),
            memoryUsage: this.getMemoryUsageStats()
        };
    }

    private calculateAverageResponseTime(): number {
        if (this.metrics.length === 0) return 0;
        const total = this.metrics.reduce((sum, metric) => sum + metric.responseTime, 0);
        return Math.round(total / this.metrics.length);
    }

    private getSlowestRequests(limit: number): PerformanceMetrics[] {
        return this.metrics
            .sort((a, b) => b.responseTime - a.responseTime)
            .slice(0, limit);
    }

    private getStatusCodeDistribution(): Record<number, number> {
        const distribution: Record<number, number> = {};
        this.metrics.forEach(metric => {
            distribution[metric.statusCode] = (distribution[metric.statusCode] || 0) + 1;
        });
        return distribution;
    }

    private getMemoryUsageStats() {
        if (this.metrics.length === 0) return null;
        
        const latest = this.metrics[this.metrics.length - 1].memoryUsage;
        return {
            rss: Math.round(latest.rss / 1024 / 1024), // MB
            heapTotal: Math.round(latest.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(latest.heapUsed / 1024 / 1024), // MB
            external: Math.round(latest.external / 1024 / 1024) // MB
        };
    }
}

// Global metrics collector
const metricsCollector = new MetricsCollector();

// Performance monitoring middleware
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const requestId = (req as any).id || 'unknown';

    // Override res.end to collect metrics
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
        const responseTime = Date.now() - startTime;
        const endMemory = process.memoryUsage();

        // Collect performance metrics
        const metric: PerformanceMetrics = {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime,
            memoryUsage: endMemory,
            timestamp: new Date().toISOString()
        };

        metricsCollector.addMetric(metric);

        // Log performance warnings
        if (responseTime > 2000) {
            logger.warn('Very slow request detected', {
                requestId,
                method: req.method,
                path: req.path,
                responseTime,
                statusCode: res.statusCode
            });
        }

        // Log memory warnings
        const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
        if (memoryIncrease > 50 * 1024 * 1024) { // 50MB increase
            logger.warn('High memory usage detected', {
                requestId,
                method: req.method,
                path: req.path,
                metadata: {
                    memoryIncrease: Math.round(memoryIncrease / 1024 / 1024) + 'MB'
                }
            });
        }

        return originalEnd.call(this, chunk, encoding);
    };

    next();
};

// Metrics endpoint
export const getMetrics = () => {
    return metricsCollector.getMetrics();
};

// Business metrics tracking
export const trackBusinessMetric = (event: string, data: any) => {
    logger.info('Business metric', {
        message: `Business metric: ${event}`,
        metadata: {
            event,
            data
        },
        timestamp: new Date().toISOString()
    });
};

// API usage tracking
export const trackApiUsage = (endpoint: string, method: string, userId?: string) => {
    logger.info('API usage', {
        message: `API usage: ${method} ${endpoint}`,
        metadata: {
            endpoint,
            method,
            userId
        },
        timestamp: new Date().toISOString()
    });
};

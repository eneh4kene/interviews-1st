import { Request, Response, NextFunction } from 'express';

// Log levels
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

// Current log level (can be set via environment variable)
const getLogLevel = (): LogLevel => {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
        case 'DEBUG': return LogLevel.DEBUG;
        case 'INFO': return LogLevel.INFO;
        case 'WARN': return LogLevel.WARN;
        case 'ERROR': return LogLevel.ERROR;
        default: return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
};

const currentLogLevel = getLogLevel();

// Structured log entry interface
interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    requestId?: string;
    userId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    responseTime?: number;
    ip?: string;
    userAgent?: string;
    error?: any;
    metadata?: any;
}

// Logging function
const log = (level: LogLevel, message: string, metadata: Partial<LogEntry> = {}) => {
    if (level < currentLogLevel) return;

    const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel[level],
        message,
        ...metadata
    };

    // In production, you might want to send this to a logging service
    console.log(JSON.stringify(logEntry));
};

// Export logging functions
export const logger = {
    debug: (message: string, metadata?: Partial<LogEntry>) => log(LogLevel.DEBUG, message, metadata),
    info: (message: string, metadata?: Partial<LogEntry>) => log(LogLevel.INFO, message, metadata),
    warn: (message: string, metadata?: Partial<LogEntry>) => log(LogLevel.WARN, message, metadata),
    error: (message: string, metadata?: Partial<LogEntry>) => log(LogLevel.ERROR, message, metadata)
};

// Request logging middleware
export const requestLogging = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = (req as any).id || 'unknown';
    
    // Log request start
    logger.info('Request started', {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
        const responseTime = Date.now() - startTime;
        
        // Log request completion
        logger.info('Request completed', {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime,
            ip: req.ip
        });

        // Log slow requests
        if (responseTime > 1000) {
            logger.warn('Slow request detected', {
                requestId,
                method: req.method,
                path: req.path,
                responseTime,
                statusCode: res.statusCode
            });
        }

        // Log errors
        if (res.statusCode >= 400) {
            logger.error('Request failed', {
                requestId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                responseTime,
                error: chunk
            });
        }

        return originalEnd.call(this, chunk, encoding);
    };

    next();
};

// Error logging middleware
export const errorLogging = (error: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).id || 'unknown';
    
    logger.error('Unhandled error', {
        requestId,
        method: req.method,
        path: req.path,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Don't expose stack traces in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(500).json({
        success: false,
        error: isDevelopment ? error.message : 'Internal server error',
        requestId
    });
};

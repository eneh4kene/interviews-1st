import express from 'express';

// Test database connection
import { db } from './utils/database';

console.log('🔍 Testing database connection...');
db.query('SELECT NOW() as current_time, version() as db_version')
    .then(result => {
        console.log('✅ Database connected successfully!');
        console.log('📅 Current time:', result.rows[0].current_time);
        console.log('🗄️ Database version:', result.rows[0].db_version);
    })
    .catch(error => {
        console.error('❌ Database connection failed:', error.message);
        console.error('💡 Make sure DATABASE_URL is set in Replit Secrets');
    });
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { z } from 'zod';
import { validateRequest } from './utils/validation';
import { ApiResponse } from '@interview-me/types';
import { checkDatabaseHealth } from './utils/database';
import { requestLogging, errorLogging, logger as appLogger } from './middleware/logging';
import { performanceMonitoring, getMetrics } from './middleware/metrics';
import clientsRouter from './routes/clients';
import interviewsRouter from './routes/interviews';
import authRouter from './routes/auth';
import resumesRouter from './routes/resumes';
import jobPreferencesRouter from './routes/jobPreferences';
import applicationsRouter from './routes/applications';
import jobsRouter from './routes/jobs';
import adminRouter from './routes/admin';
import { jobAggregationService } from './services/jobAggregation';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('🔍 Main API Environment Variables Debug:');
console.log('ADZUNA_APP_ID:', process.env.ADZUNA_APP_ID);
console.log('ADZUNA_APP_KEY:', process.env.ADZUNA_APP_KEY ? '***SET***' : 'NOT SET');
console.log('JOOBLE_API_KEY:', process.env.JOOBLE_API_KEY ? '***SET***' : 'NOT SET');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const app = express();
const PORT = process.env.PORT || 3001;

// Create logger
const logger = pinoHttp({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Trust proxy for rate limiting (needed for Replit)
app.set('trust proxy', 1);

// Middleware
app.use(logger);
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'https://*.replit.dev', 'https://*.replit.co'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Add request ID for tracking
app.use((req, res, next) => {
    req.id = Math.random().toString(36).substr(2, 9);
    res.setHeader('X-Request-ID', req.id);
    next();
});

// Structured logging middleware
app.use(requestLogging);

// Performance monitoring middleware
app.use(performanceMonitoring);

// Basic input sanitization
app.use((req, res, next) => {
    // Sanitize common XSS patterns
    const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
            return obj
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]*>/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        if (obj && typeof obj === 'object') {
            const sanitized: any = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    sanitized[key] = sanitize(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    };

    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);
    
    next();
});

// Security logging middleware
app.use((req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
        // Log security events
        if (res.statusCode >= 400) {
            console.log(`🚨 SECURITY EVENT [${req.id}]:`, {
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                error: data
            });
        }
        
        // Log authentication events
        if (req.path.includes('/auth/') && res.statusCode < 400) {
            console.log(`🔐 AUTH EVENT [${req.id}]:`, {
                timestamp: new Date().toISOString(),
                action: req.path,
                method: req.method,
                ip: req.ip,
                success: true
            });
        }
        
        return originalSend.call(this, data);
    };
    
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
    const dbHealth = await checkDatabaseHealth();

    const response: ApiResponse = {
        success: dbHealth.status === 'healthy',
        message: dbHealth.status === 'healthy' ? 'API is running' : 'API is running but database issues detected',
        data: {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbHealth,
        },
    };
    res.json(response);
});

// Enhanced health check endpoints for production monitoring
app.get('/health/ready', async (req, res) => {
    // Readiness probe - checks if the app is ready to receive traffic
    const dbHealth = await checkDatabaseHealth();
    const isReady = dbHealth.status === 'healthy';
    
    res.status(isReady ? 200 : 503).json({
        status: isReady ? 'ready' : 'not ready',
        timestamp: new Date().toISOString(),
        checks: {
            database: dbHealth.status,
            uptime: process.uptime()
        }
    });
});

app.get('/health/live', (req, res) => {
    // Liveness probe - checks if the app is alive (not crashed)
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/health/detailed', async (req, res) => {
    // Detailed health check for monitoring systems
    const startTime = Date.now();
    
    try {
        // Check all systems
        const checks = await Promise.allSettled([
            checkDatabaseHealth(),
            (async () => {
                try {
                    const { redis } = await import('./utils/database');
                    // Simple Redis check without ping method
                    await redis.get('health_check');
                    return { status: 'healthy', message: 'Redis is responding' };
                } catch (error) {
                    return { status: 'unhealthy', message: 'Redis connection failed' };
                }
            })(),
            (async () => {
                // Check if we can write to database
                const { db } = await import('./utils/database');
                await db.query('SELECT 1');
                return { status: 'healthy', message: 'Database write test successful' };
            })()
        ]);

        const response = {
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
            status: 'healthy',
            checks: checks.map((check, index) => ({
                name: ['database', 'redis', 'database_write'][index],
                status: check.status === 'fulfilled' ? check.value.status : 'unhealthy',
                message: check.status === 'fulfilled' ? (check.value as any).message : check.reason?.message || 'Unknown error'
            })),
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform
            }
        };

        const allHealthy = checks.every(check => 
            check.status === 'fulfilled' && check.value.status === 'healthy'
        );
        
        res.status(allHealthy ? 200 : 503).json(response);
    } catch (error) {
        res.status(503).json({
            timestamp: new Date().toISOString(),
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
    const metrics = getMetrics();
    res.json({
        timestamp: new Date().toISOString(),
        metrics
    });
});

// Example protected route with validation
const userSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format'),
    }),
});

app.post('/api/users', validateRequest(userSchema), (req, res) => {
    const { name, email } = req.body;

    const response: ApiResponse = {
        success: true,
        message: 'User created successfully',
        data: {
            id: 'user_' + Date.now(),
            name,
            email,
            createdAt: new Date(),
        },
    };

    res.status(201).json(response);
});

// Example route with query parameters
app.get('/api/hello', (req, res) => {
    const { name = 'World' } = req.query;

    const response: ApiResponse = {
        success: true,
        message: `Hello, ${name}!`,
        data: {
            greeting: `Hello, ${name}!`,
            timestamp: new Date().toISOString(),
        },
    };

    res.json(response);
});

// API Routes
app.use('/api/clients', clientsRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/auth', authRouter);
app.use('/api/resumes', resumesRouter);
app.use('/api/job-preferences', jobPreferencesRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/admin', adminRouter);

// Static file serving for uploaded resumes
app.use('/uploads/resumes', express.static('uploads/resumes'));

// Enhanced error handling middleware with logging
app.use(errorLogging);

// 404 handler
app.use('*', (req, res) => {
    const response: ApiResponse = {
        success: false,
        error: 'Route not found',
    };

    res.status(404).json(response);
});

app.listen(PORT, async () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);

    // Initialize job aggregation service
    try {
        await jobAggregationService.initializeCleanup();
        console.log('✅ Job aggregation service initialized');
    } catch (error) {
        console.error('❌ Failed to initialize job aggregation service:', error);
    }
}); 
import express from 'express';
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
import clientsRouter from './routes/clients';
import interviewsRouter from './routes/interviews';
import authRouter from './routes/auth';
import resumesRouter from './routes/resumes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create logger
const logger = pinoHttp({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Middleware
app.use(logger);
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);

    const response: ApiResponse = {
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    };

    res.status(500).json(response);
});

// 404 handler
app.use('*', (req, res) => {
    const response: ApiResponse = {
        success: false,
        error: 'Route not found',
    };

    res.status(404).json(response);
});

app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
}); 
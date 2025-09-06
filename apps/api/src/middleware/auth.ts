import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, hasRole, hasAnyRole } from '../utils/jwt';
import { ApiResponse } from '@interview-me/types';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                role: string;
            };
        }
    }
}

// Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (!token) {
            const response: ApiResponse = {
                success: false,
                error: 'Access token required',
            };
            return res.status(401).json(response);
        }

        const decoded = verifyToken(token);

        if (decoded.type !== 'access') {
            const response: ApiResponse = {
                success: false,
                error: 'Invalid token type',
            };
            return res.status(401).json(response);
        }

        // Add user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Authentication failed',
        };
        return res.status(401).json(response);
    }
};

// Role-based authorization middleware
export const authorize = (requiredRole: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            const response: ApiResponse = {
                success: false,
                error: 'Authentication required',
            };
            return res.status(401).json(response);
        }

        if (!hasRole({ ...req.user, type: 'access' }, requiredRole)) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return res.status(403).json(response);
        }

        next();
    };
};

// Multiple roles authorization middleware
export const authorizeAny = (requiredRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            const response: ApiResponse = {
                success: false,
                error: 'Authentication required',
            };
            return res.status(401).json(response);
        }

        if (!hasAnyRole({ ...req.user, type: 'access' }, requiredRoles)) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return res.status(403).json(response);
        }

        next();
    };
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);

        if (token) {
            const decoded = verifyToken(token);

            if (decoded.type === 'access') {
                req.user = {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role,
                };
            }
        }
    } catch (error) {
        // Silently ignore authentication errors for optional auth
        console.log('Optional auth failed:', error);
    }

    next();
};

// Resource ownership middleware (for clients, interviews, etc.)
export const requireOwnership = (resourceType: 'client' | 'interview' | 'application') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            const response: ApiResponse = {
                success: false,
                error: 'Authentication required',
            };
            return res.status(401).json(response);
        }

        // Admins can access everything
        if (req.user.role === 'ADMIN') {
            return next();
        }

        const resourceId = req.params.id;

        try {
            // Check if user owns the resource or is assigned to it
            let isOwner = false;

            switch (resourceType) {
                case 'client':
                    // Workers can access their assigned clients
                    if (req.user.role === 'WORKER') {
                        // TODO: Implement database check for client assignment
                        // For now, allow access (replace with actual DB query)
                        isOwner = true;
                    }
                    break;

                case 'interview':
                    // Workers can access interviews for their clients
                    if (req.user.role === 'WORKER') {
                        // TODO: Implement database check for interview ownership
                        isOwner = true;
                    }
                    break;

                case 'application':
                    // Workers can access applications for their clients
                    if (req.user.role === 'WORKER') {
                        // TODO: Implement database check for application ownership
                        isOwner = true;
                    }
                    break;
            }

            if (!isOwner) {
                const response: ApiResponse = {
                    success: false,
                    error: 'Access denied to this resource',
                };
                return res.status(403).json(response);
            }

            next();
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: 'Error checking resource ownership',
            };
            return res.status(500).json(response);
        }
    };
};

// Rate limiting middleware for auth endpoints
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (process.env.AUTH_RATE_LIMIT_DISABLED === 'true') {
            return next();
        }
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const endpoint = req.path;
        const key = `auth_rate_limit:${ip}:${endpoint}`;

        try {
            const { redis } = await import('../utils/database');
            const attempts = await redis.get(key);
            const currentAttempts = attempts ? parseInt(attempts) : 0;

            if (currentAttempts >= maxAttempts) {
                const response: ApiResponse = {
                    success: false,
                    error: 'Too many authentication attempts. Please try again later.',
                };
                return res.status(429).json(response);
            }

            // Increment attempts
            await redis.set(key, (currentAttempts + 1).toString(), Math.floor(windowMs / 1000));

            next();
        } catch (error) {
            // If Redis is unavailable, allow the request
            console.error('Rate limiting error:', error);
            next();
        }
    };
};

// General rate limiting middleware for all endpoints
export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (process.env.RATE_LIMIT_DISABLED === 'true') {
            return next();
        }
        
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const key = `rate_limit:${ip}`;

        try {
            const { redis } = await import('../utils/database');
            const requests = await redis.get(key);
            const currentRequests = requests ? parseInt(requests) : 0;

            if (currentRequests >= maxRequests) {
                const response: ApiResponse = {
                    success: false,
                    error: 'Too many requests from this IP. Please try again later.',
                };
                return res.status(429).json(response);
            }

            // Increment requests
            await redis.set(key, (currentRequests + 1).toString(), Math.floor(windowMs / 1000));

            next();
        } catch (error) {
            // If Redis is unavailable, allow the request
            console.error('Rate limiting error:', error);
            next();
        }
    };
}; 
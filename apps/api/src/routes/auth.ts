import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../utils/validation';
import bcrypt from 'bcryptjs';
import { generateTokenPair, verifyRefreshToken, revokeRefreshToken, verifyToken } from '../utils/jwt';
import { authRateLimit } from '../middleware/auth';
import { db } from '../utils/database';
import {
    User,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    MagicLinkRequest,
    MagicLinkResponse,
    ApiResponse
} from '@interview-me/types';

const router = express.Router();

// No mock users or passwords; all authentication uses the Neon database

// JWT configuration is now handled in utils/jwt.ts

// Validation schemas
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const refreshTokenSchema = z.object({
    refreshToken: z.string(),
});

const magicLinkSchema = z.object({
    email: z.string().email(),
    interviewId: z.string(),
});

const clientRegistrationSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().min(1),
    linkedinUrl: z.string().url().optional().or(z.literal('')),
    company: z.string().optional(),
    position: z.string().optional(),
});

// Helper functions
// JWT functions are now handled in utils/jwt.ts
const generateMagicLinkToken = (email: string, interviewId: string): string => {
    // TODO: Implement secure magic link generation
    return `magic_link_${email}_${interviewId}_${Date.now()}`;
};

// Routes
router.post('/login', authRateLimit(5, 15 * 60 * 1000), validateRequest({ body: loginSchema }), async (req, res) => {
    try {
        const { email, password } = req.body as LoginRequest;

        // Find user in database
        const { rows } = await db.query(
            'SELECT id, email, name, role, password_hash, is_active, two_factor_enabled, last_login_at, created_at, updated_at FROM users WHERE email = $1 LIMIT 1',
            [email]
        );

        if (rows.length === 0) {
            const response: LoginResponse = {
                success: false,
                error: 'Invalid credentials',
            };
            return res.status(401).json(response);
        }

        const dbUser = rows[0];

        if (!dbUser.is_active) {
            const response: LoginResponse = {
                success: false,
                error: 'Account disabled',
            };
            return res.status(403).json(response);
        }

        // Verify password using bcrypt
        const passwordHash: string = dbUser.password_hash;
        const isValid = passwordHash && await bcrypt.compare(password, passwordHash);
        if (!isValid) {
            const response: LoginResponse = {
                success: false,
                error: 'Invalid credentials',
            };
            return res.status(401).json(response);
        }

        const user: User = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            isActive: dbUser.is_active,
            twoFactorEnabled: dbUser.two_factor_enabled,
            lastLoginAt: dbUser.last_login_at || null,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
        };

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Update last login
        await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        // Clear rate-limit counter on successful login
        try {
            const ip = req.ip || (req.connection as any).remoteAddress || 'unknown';
            const endpoint = req.path;
            const key = `auth_rate_limit:${ip}:${endpoint}`;
            const { redis } = await import('../utils/database');
            await redis.del(key);
        } catch (e) {
            // ignore
        }

        const response: LoginResponse = {
            success: true,
            data: {
                user,
                accessToken,
            },
            message: 'Login successful',
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Login error:', error);
        const response: LoginResponse = {
            success: false,
            error: 'Internal server error',
        };
        res.status(500).json(response);
    }
});

router.post('/logout', (req, res) => {
    try {
        // Clear refresh token cookie
        res.clearCookie('refreshToken');

        const response: ApiResponse<null> = {
            success: true,
            data: null,
            message: 'Logout successful',
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Logout error:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Internal server error',
        };
        res.status(500).json(response);
    }
});

router.post('/refresh', validateRequest({ body: refreshTokenSchema }), async (req, res) => {
    try {
        const { refreshToken } = req.body as RefreshTokenRequest;

        // Verify refresh token using our secure JWT system
        const decoded = await verifyRefreshToken(refreshToken);

        // Find user in database
        const { rows } = await db.query(
            'SELECT id, email, name, role, is_active, two_factor_enabled, last_login_at, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
            [decoded.userId]
        );
        if (rows.length === 0 || !rows[0].is_active) {
            const response: RefreshTokenResponse = {
                success: false,
                error: 'User not found or inactive',
            };
            return res.status(401).json(response);
        }

        const user = rows[0];

        // Generate new tokens using our secure JWT system
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokenPair({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Revoke old refresh token
        await revokeRefreshToken(decoded.userId, refreshToken);

        // Set new refresh token as HTTP-only cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const response: RefreshTokenResponse = {
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
            message: 'Token refreshed successfully',
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Refresh token error:', error);
        const response: RefreshTokenResponse = {
            success: false,
            error: 'Invalid refresh token',
        };
        res.status(401).json(response);
    }
});

router.post('/magic-link', validateRequest({ body: magicLinkSchema }), (req, res) => {
    try {
        const { email, interviewId } = req.body as MagicLinkRequest;

        // In real app, verify that the email matches the client for this interview
        // For now, just generate a magic link token
        const token = generateMagicLinkToken(email, interviewId);
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

        const response: MagicLinkResponse = {
            success: true,
            data: {
                token,
                expiresAt,
            },
            message: 'Magic link generated successfully',
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Magic link error:', error);
        const response: MagicLinkResponse = {
            success: false,
            error: 'Failed to generate magic link',
        };
        res.status(500).json(response);
    }
});

router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'No valid authorization token',
            };
            return res.status(401).json(response);
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        const { rows } = await db.query(
            'SELECT id, email, name, role, is_active, two_factor_enabled, last_login_at, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
            [decoded.userId]
        );
        if (rows.length === 0 || !rows[0].is_active) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'User not found or inactive',
            };
            return res.status(401).json(response);
        }

        const user: User = {
            id: rows[0].id,
            email: rows[0].email,
            name: rows[0].name,
            role: rows[0].role,
            isActive: rows[0].is_active,
            twoFactorEnabled: rows[0].two_factor_enabled,
            lastLoginAt: rows[0].last_login_at || null,
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at,
        };

        const response: ApiResponse<User> = {
            success: true,
            data: user,
            message: 'User profile retrieved successfully',
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Get user profile error:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Invalid token',
        };
        res.status(401).json(response);
    }
});

// Client registration endpoint
router.post('/register-client', validateRequest({ body: clientRegistrationSchema }), async (req, res) => {
    try {
        const { name, email, phone, location, linkedinUrl, company, position } = req.body;

        // Check if client already exists
        const existingClient = await db.query(
            'SELECT id FROM clients WHERE email = $1',
            [email]
        );

        if (existingClient.rows.length > 0) {
            const response: ApiResponse = {
                success: false,
                error: 'A client with this email already exists',
            };
            return res.status(409).json(response);
        }

        // For now, we'll auto-assign to the first available worker
        // In a real app, you might have a queue system or round-robin assignment
        const availableWorkers = await db.query(
            'SELECT id FROM users WHERE role IN ($1, $2) AND is_active = true ORDER BY created_at ASC LIMIT 1',
            ['WORKER', 'MANAGER']
        );

        if (availableWorkers.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'No available workers to assign this client',
            };
            return res.status(503).json(response);
        }

        const workerId = availableWorkers.rows[0].id;

        // Create the client
        const result = await db.query(`
            INSERT INTO clients (worker_id, name, email, phone, linkedin_url, status, payment_status, total_interviews, total_paid, is_new)
            VALUES ($1, $2, $3, $4, $5, 'active', 'pending', 0, 0, true)
            RETURNING 
                id,
                worker_id as "workerId",
                name,
                email,
                phone,
                linkedin_url as "linkedinUrl",
                status,
                payment_status as "paymentStatus",
                total_interviews as "totalInterviews",
                total_paid as "totalPaid",
                is_new as "isNew",
                assigned_at as "assignedAt",
                created_at as "createdAt",
                updated_at as "updatedAt"
        `, [workerId, name, email, phone || null, linkedinUrl || null]);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0],
            message: 'Client registered successfully. You will be contacted by your assigned career coach soon.',
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Client registration error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to register client',
        };
        res.status(500).json(response);
    }
});

export default router; 
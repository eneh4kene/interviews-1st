import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../utils/validation';
import bcrypt from 'bcryptjs';
import { generateTokenPair, verifyRefreshToken, revokeRefreshToken, verifyToken } from '../utils/jwt';
import { authRateLimit } from '../middleware/auth';
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

// Mock data for users (in real app, this would be in a database)
const mockUsers: User[] = [
    {
        id: "worker1",
        email: "sarah.worker@interview-me.com",
        name: "Sarah Johnson",
        role: "WORKER",
        isActive: true,
        twoFactorEnabled: false,
        lastLoginAt: new Date("2024-01-15"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
    },
    {
        id: "worker2",
        email: "mike.worker@interview-me.com",
        name: "Mike Chen",
        role: "WORKER",
        isActive: true,
        twoFactorEnabled: true,
        lastLoginAt: new Date("2024-01-14"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-14"),
    },
    {
        id: "manager1",
        email: "jane.manager@interview-me.com",
        name: "Jane Smith",
        role: "MANAGER",
        isActive: true,
        twoFactorEnabled: true,
        lastLoginAt: new Date("2024-01-13"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-13"),
    },
    {
        id: "admin1",
        email: "admin@interview-me.com",
        name: "System Admin",
        role: "ADMIN",
        isActive: true,
        twoFactorEnabled: true,
        lastLoginAt: new Date("2024-01-12"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-12"),
    },
    {
        id: "client1",
        email: "sarah.johnson@email.com",
        name: "Sarah Johnson",
        role: "CLIENT",
        isActive: true,
        twoFactorEnabled: false,
        lastLoginAt: new Date("2024-01-10"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-10"),
    },
];

// Mock password hashes (in real app, these would be stored in database)
const mockPasswords: Record<string, string> = {
    "sarah.worker@interview-me.com": "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    "mike.worker@interview-me.com": "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    "jane.manager@interview-me.com": "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    "admin@interview-me.com": "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    "sarah.johnson@email.com": "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
};

// Mock refresh tokens (in real app, these would be stored in Redis/database)
const mockRefreshTokens: Record<string, { userId: string; expiresAt: Date }> = {};

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

        // Find user
        const user = mockUsers.find(u => u.email === email);
        if (!user || !user.isActive) {
            const response: LoginResponse = {
                success: false,
                error: 'Invalid credentials',
            };
            return res.status(401).json(response);
        }

        // Verify password
        const hashedPassword = mockPasswords[email];
        if (!hashedPassword || !(await bcrypt.compare(password, hashedPassword))) {
            const response: LoginResponse = {
                success: false,
                error: 'Invalid credentials',
            };
            return res.status(401).json(response);
        }

        // Generate tokens using secure JWT system
        const { accessToken, refreshToken } = generateTokenPair({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Update last login
        user.lastLoginAt = new Date();

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

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

        // Find user
        const user = mockUsers.find(u => u.id === decoded.userId);
        if (!user || !user.isActive) {
            const response: RefreshTokenResponse = {
                success: false,
                error: 'User not found or inactive',
            };
            return res.status(401).json(response);
        }

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

router.get('/me', (req, res) => {
    try {
        // In real app, this would verify the access token from Authorization header
        // For now, return a mock response
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

        const user = mockUsers.find(u => u.id === decoded.userId);
        if (!user || !user.isActive) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'User not found or inactive',
            };
            return res.status(401).json(response);
        }

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

export default router; 
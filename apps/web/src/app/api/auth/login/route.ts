import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { generateTokenPair } from '@/lib/utils/jwt';
import { auditLog, logAuthEvent, logSecurityEvent } from '@/lib/middleware/audit';
import { db } from '@/lib/utils/database';
import {
    User,
    LoginRequest,
    LoginResponse,
    ApiResponse
} from '@interview-me/types';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = loginSchema.parse(body);
        const { email, password } = validatedData as LoginRequest;

        // Find user in database
        const { rows } = await db.query(
            'SELECT id, email, name, role, password_hash, is_active, two_factor_enabled, last_login_at, created_at, updated_at FROM users WHERE email = $1 LIMIT 1',
            [email]
        );

        if (rows.length === 0) {
            logSecurityEvent('LOGIN_FAILED_USER_NOT_FOUND', { email, ip: request.ip });
            const response: LoginResponse = {
                success: false,
                error: 'Invalid credentials',
            };
            return NextResponse.json(response, { status: 401 });
        }

        const dbUser = rows[0];

        if (!dbUser.is_active) {
            logSecurityEvent('LOGIN_FAILED_ACCOUNT_DISABLED', { email, userId: dbUser.id, ip: request.ip });
            const response: LoginResponse = {
                success: false,
                error: 'Account disabled',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Verify password using bcrypt
        const passwordHash: string = dbUser.password_hash;
        const isValid = passwordHash && await bcrypt.compare(password, passwordHash);
        if (!isValid) {
            logSecurityEvent('LOGIN_FAILED_INVALID_PASSWORD', { email, userId: dbUser.id, ip: request.ip });
            const response: LoginResponse = {
                success: false,
                error: 'Invalid credentials',
            };
            return NextResponse.json(response, { status: 401 });
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

        // Log successful login
        logAuthEvent('LOGIN_SUCCESS', user.id, user.email, true);

        const response: LoginResponse = {
            success: true,
            data: {
                user,
                accessToken,
            },
            message: 'Login successful',
        };

        const nextResponse = NextResponse.json(response);

        // Set refresh token as HTTP-only cookie
        nextResponse.cookies.set('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        return nextResponse;
    } catch (error) {
        console.error('Login error:', error);
        const response: LoginResponse = {
            success: false,
            error: 'Internal server error',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

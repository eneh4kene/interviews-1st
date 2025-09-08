import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import {
    User,
    ApiResponse
} from '@interview-me/types';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response: ApiResponse<null> = {
                success: false,
                error: 'No valid authorization token',
            };
            return NextResponse.json(response, { status: 401 });
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
            return NextResponse.json(response, { status: 401 });
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

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get user profile error:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Invalid token',
        };
        return NextResponse.json(response, { status: 401 });
    }
}

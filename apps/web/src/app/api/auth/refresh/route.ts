import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateTokenPair, verifyRefreshToken, revokeRefreshToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import {
    RefreshTokenRequest,
    RefreshTokenResponse,
    ApiResponse
} from '@interview-me/types';

const refreshTokenSchema = z.object({
    refreshToken: z.string(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = refreshTokenSchema.parse(body);
        const { refreshToken } = validatedData as RefreshTokenRequest;

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
            return NextResponse.json(response, { status: 401 });
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

        const response: RefreshTokenResponse = {
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
            message: 'Token refreshed successfully',
        };

        const nextResponse = NextResponse.json(response);

        // Set new refresh token as HTTP-only cookie
        nextResponse.cookies.set('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        return nextResponse;
    } catch (error) {
        console.error('Refresh token error:', error);
        const response: RefreshTokenResponse = {
            success: false,
            error: 'Invalid refresh token',
        };
        return NextResponse.json(response, { status: 401 });
    }
}

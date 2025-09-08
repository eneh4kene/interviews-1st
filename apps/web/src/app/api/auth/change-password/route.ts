import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response: ApiResponse = {
                success: false,
                error: 'No valid authorization token',
            };
            return NextResponse.json(response, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        const body = await request.json();
        const validatedData = changePasswordSchema.parse(body);
        const { currentPassword, newPassword } = validatedData;

        // Get current user with password hash
        const { rows } = await db.query(
            'SELECT id, email, password_hash FROM users WHERE id = $1 LIMIT 1',
            [decoded.userId]
        );

        if (rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'User not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        const user = rows[0];

        // Verify current password
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidCurrentPassword) {
            const response: ApiResponse = {
                success: false,
                error: 'Current password is incorrect',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password in database
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, user.id]
        );

        const response: ApiResponse = {
            success: true,
            message: 'Password changed successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Change password error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to change password',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

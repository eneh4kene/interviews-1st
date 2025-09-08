import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/utils/database';
import { ApiResponse } from '@interview-me/types';
import bcrypt from 'bcryptjs';

// Reset user password (admin only)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json({
                success: false,
                error: 'User ID and new password are required',
            }, { status: 400 });
        }

        // Check if user exists
        const userCheck = await db.query(
            'SELECT id, email, name, role FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'User not found',
            }, { status: 404 });
        }

        const user = userCheck.rows[0];

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password in database
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [passwordHash, userId]
        );

        const response: ApiResponse = {
            success: true,
            message: `Password reset successfully for ${user.name} (${user.email})`,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error resetting password:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to reset password',
        }, { status: 500 });
    }
}

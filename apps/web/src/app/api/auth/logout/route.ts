import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@interview-me/types';

export async function POST(request: NextRequest) {
    try {
        const response: ApiResponse<null> = {
            success: true,
            data: null,
            message: 'Logout successful',
        };

        const nextResponse = NextResponse.json(response);

        // Clear refresh token cookie
        nextResponse.cookies.set('refreshToken', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
        });

        return nextResponse;
    } catch (error) {
        console.error('Logout error:', error);
        const response: ApiResponse<null> = {
            success: false,
            error: 'Internal server error',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

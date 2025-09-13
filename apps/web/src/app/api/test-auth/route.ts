// Test Auth API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Testing auth middleware...');

        // Test auth middleware
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "No valid authorization token" },
                { status: 401 }
            );
        }
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        return NextResponse.json({
            success: true,
            data: {
                message: 'Auth test successful',
                user: decoded
            }
        });
    } catch (error) {
        console.error('Test auth error:', error);
        return NextResponse.json(
            { success: false, error: 'Test auth failed' },
            { status: 500 }
        );
    }
}

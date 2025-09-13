// Debug Auth API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Debug auth middleware...');
        console.log('🔍 Request headers:', Object.fromEntries(request.headers.entries()));

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
                message: 'Auth debug successful',
                user: decoded,
                headers: Object.fromEntries(request.headers.entries())
            }
        });
    } catch (error) {
        console.error('Debug auth error:', error);
        return NextResponse.json(
            { success: false, error: 'Debug auth failed' },
            { status: 500 }
        );
    }
}

// Debug Auth API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth-nextjs';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Debug auth middleware...');
        console.log('🔍 Request headers:', Object.fromEntries(request.headers.entries()));

        // Test auth middleware
        const authResult = await authMiddleware(request);

        console.log('🔍 Auth result:', authResult);

        return NextResponse.json({
            success: true,
            authResult,
            headers: Object.fromEntries(request.headers.entries()),
            debug: {
                authHeader: request.headers.get('authorization'),
                hasToken: !!request.headers.get('authorization'),
                userAgent: request.headers.get('user-agent'),
                referer: request.headers.get('referer')
            }
        });

    } catch (error) {
        console.error('❌ Debug auth error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Debug auth failed',
                debug: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined
                }
            },
            { status: 500 }
        );
    }
}

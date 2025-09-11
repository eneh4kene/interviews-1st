// Test Auth API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth-nextjs';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Testing auth middleware...');

        // Test auth middleware
        const authResult = await authMiddleware(request);

        console.log('🔍 Auth result:', authResult);

        if (!authResult.success) {
            return NextResponse.json({
                success: false,
                error: authResult.error,
                debug: {
                    authHeader: request.headers.get('authorization'),
                    hasToken: !!request.headers.get('authorization')
                }
            });
        }

        return NextResponse.json({
            success: true,
            user: authResult.user,
            debug: {
                authHeader: request.headers.get('authorization'),
                hasToken: !!request.headers.get('authorization')
            }
        });

    } catch (error) {
        console.error('❌ Test auth error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Test auth failed',
                debug: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined
                }
            },
            { status: 500 }
        );
    }
}

// Test AI Apply Service API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { aiApplyService } from '@/lib/services/AiApplyService';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Testing AI Apply service...');

        // Test database connection by trying to get applications for a test client
        const testClientId = 'test-client-id';
        const applications = await aiApplyService.getClientApplications(testClientId);

        console.log('🔍 AI Apply service test successful');

        return NextResponse.json({
            success: true,
            message: 'AI Apply service is working',
            data: {
                applicationsCount: applications.length,
                applications: applications
            }
        });

    } catch (error) {
        console.error('❌ AI Apply service test error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'AI Apply service test failed',
                debug: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined
                }
            },
            { status: 500 }
        );
    }
}

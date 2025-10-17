// Test AI Resume Service API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { aiResumeService } from '@/lib/services/AiResumeService';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Testing AI Resume service...');

        // Test database connection by trying to get resume generations for a test client
        const testClientId = 'test-client-id';
        const resumeGenerations = await aiResumeService.getClientResumeGenerations(testClientId);

        console.log('🔍 AI Resume service test successful');

        return NextResponse.json({
            success: true,
            message: 'AI Resume service is working',
            data: {
                resumeGenerationsCount: resumeGenerations.length,
                resumeGenerations: resumeGenerations
            }
        });

    } catch (error) {
        console.error('❌ AI Resume service test error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'AI Resume service test failed',
                debug: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined
                }
            },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function GET(request: NextRequest) {
    try {
        const dbHealth = await checkDatabaseHealth();

        const response: ApiResponse = {
            success: dbHealth.status === 'healthy',
            message: dbHealth.status === 'healthy' ? 'API is running' : 'API is running but database issues detected',
            data: {
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: dbHealth,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Health check failed',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

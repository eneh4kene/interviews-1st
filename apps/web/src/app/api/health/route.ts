import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Health check requested');
        const dbHealth = await checkDatabaseHealth();
        console.log('✅ Health check result:', dbHealth);

        const response: ApiResponse = {
            success: dbHealth.status === 'healthy',
            message: dbHealth.status === 'healthy' ? 'API is running' : 'API is running but database issues detected',
            data: {
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
                },
                database: dbHealth,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('❌ Health check failed:', error);
        const response: ApiResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Health check failed',
            data: {
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            }
        };
        return NextResponse.json(response, { status: 500 });
    }
}

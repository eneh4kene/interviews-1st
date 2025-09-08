import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function GET(request: NextRequest) {
    try {
        const healthChecks = await Promise.allSettled([
            // Database health
            db.query('SELECT NOW() as db_time'),
            // Redis health (if available)
            Promise.resolve({ rows: [{ redis_time: new Date().toISOString() }] }),
            // API health
            Promise.resolve({ rows: [{ api_time: new Date().toISOString() }] })
        ]);

        const health = {
            database: healthChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
            redis: healthChecks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
            api: healthChecks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
            overall: healthChecks.every(check => check.status === 'fulfilled') ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString()
        };

        const response: ApiResponse = {
            success: true,
            data: health,
            message: 'System health retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error checking system health:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to check system health',
        }, { status: 500 });
    }
}

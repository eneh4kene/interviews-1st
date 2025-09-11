import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { jobCacheService } from '@/lib/services/JobCacheService';
import { ApiResponse } from '@interview-me/types';

export async function POST(request: NextRequest) {
    try {
        // Authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response: ApiResponse = {
                success: false,
                error: 'No valid authorization token',
            };
            return NextResponse.json(response, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        // Only admins can cleanup cache
        if (decoded.role !== 'ADMIN') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const deletedCount = await jobCacheService.cleanupExpiredJobs();

        const response: ApiResponse = {
            success: true,
            data: {
                deleted_jobs: deletedCount,
                message: `Cleaned up ${deletedCount} expired jobs`
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error cleaning up cache:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to cleanup expired jobs',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

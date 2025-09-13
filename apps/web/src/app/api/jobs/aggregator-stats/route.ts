import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { jobStatisticsService } from '@/lib/services/JobStatisticsService';
import { ApiResponse } from '@interview-me/types';

// Get aggregator-level statistics
export async function GET(request: NextRequest) {
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

        // Only admins can access aggregator stats
        if (decoded.role !== 'ADMIN') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions - Admin access required'
            }, { status: 403 });
        }

        const stats = await jobStatisticsService.getAggregatorStats();

        const response: ApiResponse = {
            success: true,
            data: stats
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error getting aggregator stats:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to get aggregator statistics'
        }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { jobAggregationService } from '@/lib/services/jobAggregation';
import { ApiResponse } from '@interview-me/types';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const job = await jobAggregationService.getJobById(id);

        if (!job) {
            const response: ApiResponse = {
                success: false,
                error: 'Job not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        const response: ApiResponse = {
            success: true,
            data: job,
            message: 'Job retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get job error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve job',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

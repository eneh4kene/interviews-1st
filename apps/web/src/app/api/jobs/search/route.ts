import { NextRequest, NextResponse } from 'next/server';
import { jobAggregationService } from '@/lib/services/jobAggregation';
import { ApiResponse } from '@interview-me/types';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const location = searchParams.get('location') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const salaryMin = searchParams.get('salaryMin');
        const salaryMax = searchParams.get('salaryMax');
        const source = searchParams.get('source') || 'all';

        const searchParams_obj = {
            query,
            location,
            page,
            limit,
            ...(salaryMin && { salaryMin: parseInt(salaryMin) }),
            ...(salaryMax && { salaryMax: parseInt(salaryMax) }),
            ...(source !== 'all' && { source })
        };

        const result = await jobAggregationService.searchJobs(searchParams_obj);

        const response: ApiResponse = {
            success: true,
            data: result,
            message: 'Jobs retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Job search error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to search jobs',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

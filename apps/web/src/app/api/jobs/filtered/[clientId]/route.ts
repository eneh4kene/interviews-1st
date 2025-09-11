import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { jobDiscoveryService } from '@/lib/services/JobDiscoveryService';
import { ApiResponse } from '@interview-me/types';

export async function GET(
    request: NextRequest,
    { params }: { params: { clientId: string } }
) {
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

        const { clientId } = params;
        const { searchParams } = new URL(request.url);

        // Extract query parameters
        const keywords = searchParams.get('keywords');
        const location = searchParams.get('location');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const salaryMin = searchParams.get('salaryMin');
        const salaryMax = searchParams.get('salaryMax');
        const workType = searchParams.get('workType') as 'remote' | 'hybrid' | 'onsite';
        const source = searchParams.get('source');
        const aiApplicableOnly = searchParams.get('aiApplicableOnly') === 'true';

        // Verify user has access to this client
        const { rows: clientRows } = await db.query(
            'SELECT worker_id FROM clients WHERE id = $1',
            [clientId]
        );

        if (clientRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only access their own clients
        if (decoded.role !== 'ADMIN' && clientRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Build filters
        const filters = {
            keywords: keywords || undefined,
            location: location || undefined,
            page,
            limit,
            salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
            salaryMax: salaryMax ? parseInt(salaryMax) : undefined,
            workType,
            source: source || undefined,
            aiApplicableOnly
        };

        // Get filtered jobs
        console.log('Getting filtered jobs for client:', clientId, 'with filters:', filters);
        const jobs = await jobDiscoveryService.getFilteredJobsForClient(clientId, filters);
        console.log('Found jobs:', jobs.length);

        const response: ApiResponse = {
            success: true,
            data: {
                jobs,
                pagination: {
                    page: filters.page,
                    limit: filters.limit,
                    total: jobs.length
                }
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error getting filtered jobs:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        const response: ApiResponse = {
            success: false,
            error: `Failed to get filtered jobs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
        return NextResponse.json(response, { status: 500 });
    }
}

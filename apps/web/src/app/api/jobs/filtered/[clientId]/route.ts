import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { jobDiscoveryService } from '@/lib/services/JobDiscoveryService';
import { ApiResponse } from '@interview-me/types';

// Get filtered jobs for a specific client
export async function GET(
    request: NextRequest,
    { params }: { params: { clientId: string } }
) {
    try {
        console.log('🔍 API: Starting jobs filtered request');

        // Authentication
        const authHeader = request.headers.get('authorization');
        console.log('🔍 API: Auth header present:', !!authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ API: No valid authorization token');
            const response: ApiResponse = {
                success: false,
                error: 'No valid authorization token',
            };
            return NextResponse.json(response, { status: 401 });
        }

        const token = authHeader.substring(7);
        console.log('🔍 API: Verifying token...');
        const decoded = verifyToken(token);
        console.log('🔍 API: Token verified:', !!decoded);

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
        const aiFilterType = searchParams.get('aiFilterType') as 'all' | 'ai_only' | 'manual_only' | 'high_confidence' | 'medium_confidence' | 'low_confidence';

        // Validate client ID
        if (!clientId) {
            return NextResponse.json({
                success: false,
                error: 'Client ID is required'
            }, { status: 400 });
        }

        // Verify user has access to this client
        const { rows: clientRows } = await db.query(
            'SELECT worker_id FROM clients WHERE id = $1',
            [clientId]
        );

        if (clientRows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Client not found'
            }, { status: 404 });
        }

        // Non-admin users can only access their own clients
        if (decoded.role !== 'ADMIN' && clientRows[0].worker_id !== decoded.userId) {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
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
            aiApplicableOnly,
            aiFilterType: aiFilterType || 'all'
        };

        // Get filtered jobs
        console.log('🔍 API: Calling jobDiscoveryService...');
        const jobs = await jobDiscoveryService.getFilteredJobsForClient(clientId, filters);
        console.log('🔍 API: Jobs returned:', jobs.length);

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
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            clientId,
            filters
        });
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get filtered jobs'
        }, { status: 500 });
    }
}
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

        // Get job statistics
        const stats = await jobDiscoveryService.getClientJobStats(clientId);

        const response: ApiResponse = {
            success: true,
            data: stats
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error getting job stats:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to get job statistics',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { jobDiscoveryService } from '@/lib/services/JobDiscoveryService';
import { ApiResponse } from '@interview-me/types';

// Get job discovery statistics for a client
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

        const stats = await jobDiscoveryService.getClientJobStats(clientId);

        const response: ApiResponse = {
            success: true,
            data: stats
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error getting job stats:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to get job statistics'
        }, { status: 500 });
    }
}
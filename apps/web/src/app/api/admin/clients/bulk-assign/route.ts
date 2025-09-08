import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function POST(request: NextRequest) {
    try {
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

        if (decoded.role !== 'ADMIN') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const body = await request.json();
        const { clientIds, workerId } = body;

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client IDs are required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        if (!workerId) {
            const response: ApiResponse = {
                success: false,
                error: 'Worker ID is required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Verify worker exists
        const workerCheck = await db.query(
            'SELECT id FROM users WHERE id = $1 AND role IN ($2, $3)',
            [workerId, 'WORKER', 'MANAGER']
        );

        if (workerCheck.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Worker not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Verify all clients exist
        const clientCheck = await db.query(
            `SELECT id FROM clients WHERE id = ANY($1)`,
            [clientIds]
        );

        if (clientCheck.rows.length !== clientIds.length) {
            const response: ApiResponse = {
                success: false,
                error: 'One or more clients not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Update clients in batches
        const batchSize = 100;
        let updatedCount = 0;

        for (let i = 0; i < clientIds.length; i += batchSize) {
            const batch = clientIds.slice(i, i + batchSize);
            const placeholders = batch.map((_, index) => `$${index + 2}`).join(',');
            
            const result = await db.query(
                `UPDATE clients 
                 SET worker_id = $1, assigned_at = NOW(), updated_at = NOW()
                 WHERE id IN (${placeholders})`,
                [workerId, ...batch]
            );
            
            updatedCount += result.rowCount || 0;
        }

        const response: ApiResponse = {
            success: true,
            data: { updatedCount },
            message: `Successfully assigned ${updatedCount} clients to worker`,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Bulk assign clients error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to assign clients',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

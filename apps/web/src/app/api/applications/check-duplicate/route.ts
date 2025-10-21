import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
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

        const { clientId, jobId } = await request.json();

        if (!clientId || !jobId) {
            const response: ApiResponse = {
                success: false,
                error: 'Client ID and Job ID are required',
            };
            return NextResponse.json(response, { status: 400 });
        }

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

        // Check for existing application
        const { rows: existingApps } = await db.query(
            'SELECT id, application_type, status, created_at FROM applications WHERE client_id = $1 AND job_id = $2',
            [clientId, jobId]
        );

        const isDuplicate = existingApps.length > 0;
        const existingApplication = existingApps[0] || null;

        const response: ApiResponse = {
            success: true,
            data: {
                isDuplicate,
                existingApplication,
                existingApplicationId: existingApplication?.id || null,
                message: isDuplicate
                    ? `Application already exists (${existingApplication?.application_type}, ${existingApplication?.status})`
                    : 'No duplicate application found'
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error checking duplicate application:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to check for duplicate application',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

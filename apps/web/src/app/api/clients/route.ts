import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse, Client } from '@interview-me/types';

export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const workerId = searchParams.get('workerId');

        // Get worker ID from authenticated user or query parameter
        let targetWorkerId = workerId;

        // If no workerId in query and user is not admin, use their own ID
        if (!targetWorkerId) {
            if (decoded.role === 'ADMIN') {
                const response: ApiResponse = {
                    success: false,
                    error: 'Worker ID is required for admin users',
                };
                return NextResponse.json(response, { status: 400 });
            }
            targetWorkerId = decoded.userId;
        }

        // Non-admin users can only access their own data
        if (decoded.role !== 'ADMIN' && targetWorkerId !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        let query = `
            SELECT 
                c.id,
                c.worker_id as "workerId",
                c.name,
                c.email,
                c.phone,
                c.linkedin_url as "linkedinUrl",
                c.status,
                c.payment_status as "paymentStatus",
                c.total_interviews as "totalInterviews",
                c.total_paid as "totalPaid",
                c.is_new as "isNew",
                c.assigned_at as "assignedAt",
                c.created_at as "createdAt",
                c.updated_at as "updatedAt",
                u.name as "workerName",
                u.email as "workerEmail"
            FROM clients c
            LEFT JOIN users u ON c.worker_id = u.id
            WHERE c.worker_id = $1
        `;
        const params = [targetWorkerId];

        if (status && status !== 'all') {
            query += ` AND c.status = $2`;
            params.push(status);
        }

        query += ` ORDER BY c.created_at DESC`;

        const { rows } = await db.query(query, params);

        const clients: Client[] = rows.map(row => ({
            id: row.id,
            workerId: row.workerId,
            name: row.name,
            email: row.email,
            phone: row.phone,
            linkedinUrl: row.linkedinUrl,
            status: row.status,
            paymentStatus: row.paymentStatus,
            totalInterviews: row.totalInterviews,
            totalPaid: row.totalPaid,
            isNew: row.isNew,
            assignedAt: row.assignedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }));

        const response: ApiResponse<Client[]> = {
            success: true,
            data: clients,
            message: 'Clients retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get clients error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve clients',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

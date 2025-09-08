import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse, Client } from '@interview-me/types';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const { id } = params;

        const { rows } = await db.query(`
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
            WHERE c.id = $1
        `, [id]);

        if (rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        const row = rows[0];

        // Non-admin users can only access their own clients
        if (decoded.role !== 'ADMIN' && row.workerId !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const client: Client = {
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
        };

        const response: ApiResponse<Client> = {
            success: true,
            data: client,
            message: 'Client retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get client error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve client',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const { id } = params;
        const body = await request.json();

        // Check if client exists and user has permission
        const { rows: existingRows } = await db.query(`
            SELECT worker_id FROM clients WHERE id = $1
        `, [id]);

        if (existingRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only update their own clients
        if (decoded.role !== 'ADMIN' && existingRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Update client
        const { rows } = await db.query(`
            UPDATE clients 
            SET 
                name = COALESCE($2, name),
                email = COALESCE($3, email),
                phone = COALESCE($4, phone),
                linkedin_url = COALESCE($5, linkedin_url),
                status = COALESCE($6, status),
                payment_status = COALESCE($7, payment_status),
                updated_at = NOW()
            WHERE id = $1
            RETURNING 
                id,
                worker_id as "workerId",
                name,
                email,
                phone,
                linkedin_url as "linkedinUrl",
                status,
                payment_status as "paymentStatus",
                total_interviews as "totalInterviews",
                total_paid as "totalPaid",
                is_new as "isNew",
                assigned_at as "assignedAt",
                created_at as "createdAt",
                updated_at as "updatedAt"
        `, [
            id,
            body.name,
            body.email,
            body.phone,
            body.linkedinUrl,
            body.status,
            body.paymentStatus
        ]);

        const row = rows[0];
        const client: Client = {
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
        };

        const response: ApiResponse<Client> = {
            success: true,
            data: client,
            message: 'Client updated successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Update client error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to update client',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const { id } = params;

        // Check if client exists and user has permission
        const { rows: existingRows } = await db.query(`
            SELECT worker_id FROM clients WHERE id = $1
        `, [id]);

        if (existingRows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Non-admin users can only delete their own clients
        if (decoded.role !== 'ADMIN' && existingRows[0].worker_id !== decoded.userId) {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Delete client
        await db.query('DELETE FROM clients WHERE id = $1', [id]);

        const response: ApiResponse = {
            success: true,
            message: 'Client deleted successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Delete client error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to delete client',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

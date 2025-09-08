import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

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

        if (decoded.role !== 'ADMIN') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const { rows } = await db.query(
            `SELECT 
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
            WHERE c.id = $1`,
            [params.id]
        );

        if (rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        const client = {
            id: rows[0].id,
            worker_id: rows[0].workerId,
            name: rows[0].name,
            email: rows[0].email,
            phone: rows[0].phone,
            linkedin_url: rows[0].linkedinUrl,
            status: rows[0].status,
            payment_status: rows[0].paymentStatus,
            total_interviews: rows[0].totalInterviews,
            total_paid: rows[0].totalPaid,
            is_new: rows[0].isNew,
            assigned_at: rows[0].assignedAt,
            created_at: rows[0].createdAt,
            updated_at: rows[0].updatedAt,
            worker_name: rows[0].workerName,
            worker_email: rows[0].workerEmail,
        };

        const response: ApiResponse = {
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

        if (decoded.role !== 'ADMIN') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const body = await request.json();
        const { name, email, phone, linkedinUrl, status, paymentStatus, workerId } = body;

        if (!name || !email) {
            const response: ApiResponse = {
                success: false,
                error: 'Name and email are required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Check if client exists
        const existingClient = await db.query(
            'SELECT id FROM clients WHERE id = $1',
            [params.id]
        );

        if (existingClient.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Check if email is already taken by another client
        const emailCheck = await db.query(
            'SELECT id FROM clients WHERE email = $1 AND id != $2',
            [email, params.id]
        );

        if (emailCheck.rows.length > 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Email is already taken by another client',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Update client
        await db.query(
            `UPDATE clients 
             SET name = $1, email = $2, phone = $3, linkedin_url = $4, status = $5, payment_status = $6, worker_id = $7, updated_at = NOW()
             WHERE id = $8`,
            [name, email, phone || null, linkedinUrl || null, status || 'active', paymentStatus || 'pending', workerId || null, params.id]
        );

        const response: ApiResponse = {
            success: true,
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

        if (decoded.role !== 'ADMIN') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        // Check if client exists
        const existingClient = await db.query(
            'SELECT id FROM clients WHERE id = $1',
            [params.id]
        );

        if (existingClient.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Delete client
        await db.query('DELETE FROM clients WHERE id = $1', [params.id]);

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

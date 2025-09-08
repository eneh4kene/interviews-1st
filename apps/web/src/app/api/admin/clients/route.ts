import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

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

        if (decoded.role !== 'ADMIN') {
            const response: ApiResponse = {
                success: false,
                error: 'Insufficient permissions',
            };
            return NextResponse.json(response, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const workerId = searchParams.get('workerId') || 'all';
        const sortBy = searchParams.get('sortBy') || 'created_at';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        const offset = (page - 1) * limit;

        // Build the query
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        // Search condition
        if (search) {
            whereConditions.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Status filter
        if (status !== 'all') {
            whereConditions.push(`c.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        // Worker filter
        if (workerId !== 'all') {
            whereConditions.push(`c.worker_id = $${paramIndex}`);
            params.push(workerId);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Count query
        const countQuery = `
            SELECT COUNT(*) as total
            FROM clients c
            LEFT JOIN users u ON c.worker_id = u.id
            ${whereClause}
        `;

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);

        // Main query
        const query = `
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
            ${whereClause}
            ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const { rows } = await db.query(query, params);

        const clients = rows.map((row: any) => ({
            id: row.id,
            worker_id: row.workerId,
            name: row.name,
            email: row.email,
            phone: row.phone,
            linkedin_url: row.linkedinUrl,
            status: row.status,
            payment_status: row.paymentStatus,
            total_interviews: row.totalInterviews,
            total_paid: row.totalPaid,
            is_new: row.isNew,
            assigned_at: row.assignedAt,
            created_at: row.createdAt,
            updated_at: row.updatedAt,
            worker_name: row.workerName,
            worker_email: row.workerEmail,
        }));

        const pagination = {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        };

        const response: ApiResponse = {
            success: true,
            data: {
                clients,
                pagination,
            },
            message: 'Clients retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get admin clients error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve clients',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

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
        const { name, email, phone, linkedinUrl, workerId } = body;

        if (!name || !email) {
            const response: ApiResponse = {
                success: false,
                error: 'Name and email are required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Check if client already exists
        const existingClient = await db.query(
            'SELECT id FROM clients WHERE email = $1',
            [email]
        );

        if (existingClient.rows.length > 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client with this email already exists',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Create client
        const result = await db.query(
            `INSERT INTO clients (name, email, phone, linkedin_url, worker_id, status, payment_status, total_interviews, total_paid, is_new, assigned_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'active', 'pending', 0, 0, true, NOW(), NOW(), NOW())
             RETURNING id`,
            [name, email, phone || null, linkedinUrl || null, workerId || null]
        );

        const response: ApiResponse = {
            success: true,
            data: { id: result.rows[0].id },
            message: 'Client created successfully',
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('Create client error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to create client',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

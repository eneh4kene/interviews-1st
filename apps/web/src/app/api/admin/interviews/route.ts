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
        const clientId = searchParams.get('clientId') || 'all';
        const workerId = searchParams.get('workerId') || 'all';
        const sortBy = searchParams.get('sortBy') || 'scheduled_date';
        const sortOrder = searchParams.get('sortOrder') || 'desc';
        const dateFrom = searchParams.get('dateFrom') || '';
        const dateTo = searchParams.get('dateTo') || '';

        const offset = (page - 1) * limit;

        // Build the query
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        // Search condition
        if (search) {
            whereConditions.push(`(i.company_name ILIKE $${paramIndex} OR i.job_title ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Status filter
        if (status !== 'all') {
            whereConditions.push(`i.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        // Client filter
        if (clientId !== 'all') {
            whereConditions.push(`i.client_id = $${paramIndex}`);
            params.push(clientId);
            paramIndex++;
        }

        // Worker filter
        if (workerId !== 'all') {
            whereConditions.push(`c.worker_id = $${paramIndex}`);
            params.push(workerId);
            paramIndex++;
        }

        // Date range filter
        if (dateFrom) {
            whereConditions.push(`i.scheduled_date >= $${paramIndex}`);
            params.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            whereConditions.push(`i.scheduled_date <= $${paramIndex}`);
            params.push(dateTo);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Count query
        const countQuery = `
            SELECT COUNT(*) as total
            FROM interviews i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN users u ON c.worker_id = u.id
            ${whereClause}
        `;

        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);

        // Main query
        const query = `
            SELECT 
                i.id,
                i.client_id as "clientId",
                i.company_name as "companyName",
                i.job_title as "jobTitle",
                i.scheduled_date as "scheduledDate",
                i.interview_type as "interviewType",
                i.status,
                i.payment_status as "paymentStatus",
                i.payment_amount as "paymentAmount",
                i.worker_notes as "notes",
                i.client_response_notes as "feedback",
                i.created_at as "createdAt",
                i.updated_at as "updatedAt",
                c.name as "clientName",
                c.email as "clientEmail",
                c.phone as "clientPhone",
                u.name as "workerName",
                u.email as "workerEmail"
            FROM interviews i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN users u ON c.worker_id = u.id
            ${whereClause}
            ORDER BY i.${sortBy} ${sortOrder.toUpperCase()}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const { rows } = await db.query(query, params);

        const interviews = rows.map((row: any) => ({
            id: row.id,
            client_id: row.clientId,
            title: `${row.companyName} - ${row.jobTitle}`, // Create title from company and job
            company_name: row.companyName,
            job_title: row.jobTitle,
            scheduled_date: row.scheduledDate,
            interview_type: row.interviewType,
            status: row.status,
            payment_status: row.paymentStatus,
            payment_amount: row.paymentAmount,
            notes: row.notes,
            feedback: row.feedback,
            rating: 0, // Default rating since it doesn't exist in DB
            created_at: row.createdAt,
            updated_at: row.updatedAt,
            client_name: row.clientName,
            client_email: row.clientEmail,
            client_phone: row.clientPhone,
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
                interviews,
                pagination,
            },
            message: 'Interviews retrieved successfully',
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Get admin interviews error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to retrieve interviews',
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
        const {
            clientId,
            companyName,
            jobTitle,
            scheduledDate,
            interviewType,
            notes
        } = body;

        if (!clientId || !companyName || !jobTitle || !scheduledDate) {
            const response: ApiResponse = {
                success: false,
                error: 'Client ID, company name, job title, and scheduled date are required',
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Verify client exists
        const clientCheck = await db.query(
            'SELECT id FROM clients WHERE id = $1',
            [clientId]
        );

        if (clientCheck.rows.length === 0) {
            const response: ApiResponse = {
                success: false,
                error: 'Client not found',
            };
            return NextResponse.json(response, { status: 404 });
        }

        // Create interview
        const result = await db.query(
            `INSERT INTO interviews (client_id, company_name, job_title, scheduled_date, interview_type, status, payment_status, payment_amount, worker_notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'scheduled', 'pending', 10.00, $6, NOW(), NOW())
             RETURNING id`,
            [clientId, companyName, jobTitle, scheduledDate, interviewType || 'video', notes || null]
        );

        const response: ApiResponse = {
            success: true,
            data: { id: result.rows[0].id },
            message: 'Interview created successfully',
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('Create interview error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Failed to create interview',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

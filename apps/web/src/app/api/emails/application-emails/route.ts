import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

// Get application emails
export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');
        const status = searchParams.get('status') || 'all';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let whereConditions = [];
        let params: any[] = [];
        let paramCount = 0;

        if (clientId) {
            paramCount++;
            whereConditions.push(`client_id = $${paramCount}`);
            params.push(clientId);
        }

        if (status !== 'all') {
            paramCount++;
            whereConditions.push(`status = $${paramCount}`);
            params.push(status);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const result = await db.query(`
            SELECT id, client_id, proxy_email, company_email, job_title, 
                   company_name, domain_type, status, last_email_received, 
                   email_count, created_at
            FROM application_emails
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, [...params, limit, offset]);

        const countResult = await db.query(`
            SELECT COUNT(*) as total
            FROM application_emails
            ${whereClause}
        `, params);

        const response: ApiResponse = {
            success: true,
            data: {
                applicationEmails: result.rows,
                pagination: {
                    page,
                    limit,
                    total: Number(countResult.rows[0].total),
                    pages: Math.ceil(Number(countResult.rows[0].total) / limit)
                }
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching application emails:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch application emails'
        }, { status: 500 });
    }
}

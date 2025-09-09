import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';
import { verifyToken } from '@/lib/utils/jwt';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'No valid authorization token' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (!['ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'all';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params: any[] = [];
        let paramCount = 0;

        if (status !== 'all') {
            paramCount++;
            whereClause = `WHERE status = $${paramCount}`;
            params.push(status);
        }

        const result = await db.query(`
            SELECT id, to_email, to_name, subject, status, priority, 
                   scheduled_at, sent_at, error_message, retry_count, created_at
            FROM email_queue
            ${whereClause}
            ORDER BY priority DESC, scheduled_at ASC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, [...params, limit, offset]);

        const countResult = await db.query(`
            SELECT COUNT(*) as total
            FROM email_queue
            ${whereClause}
        `, params);

        const response: ApiResponse = {
            success: true,
            data: {
                emails: result.rows,
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
        console.error('Error fetching email queue:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch email queue' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'No valid authorization token' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (decoded.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
        }

        // Process email queue
        // This would typically trigger a background job processor
        // For now, we'll just return success
        const response: ApiResponse = {
            success: true,
            data: { message: 'Email queue processing initiated' }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error processing email queue:', error);
        return NextResponse.json({ success: false, error: 'Failed to process email queue' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';
import { verifyToken } from '@/lib/utils/jwt';

export async function GET(request: NextRequest) {
    try {
        // For now, skip authentication for email queue (admin-only feature)
        // TODO: Implement proper admin authentication

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
        // For now, skip authentication for email queue (admin-only feature)
        // TODO: Implement proper admin authentication

        // Import and process email queue using existing email service
        const { emailService } = await import('@/lib/services/emailService');

        await emailService.processQueue();

        const response: ApiResponse = {
            success: true,
            data: {
                message: 'Email queue processing completed'
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error processing email queue:', error);
        return NextResponse.json({ success: false, error: 'Failed to process email queue' }, { status: 500 });
    }
}

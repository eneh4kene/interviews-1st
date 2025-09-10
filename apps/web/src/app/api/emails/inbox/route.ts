import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status') || 'all';
        const search = searchParams.get('search') || '';

        const offset = (page - 1) * limit;

        // Build query
        let whereClause = 'WHERE 1=1';
        const queryParams: any[] = [];
        let paramCount = 0;

        if (status !== 'all') {
            paramCount++;
            whereClause += ` AND status = $${paramCount}`;
            queryParams.push(status);
        }

        if (search) {
            paramCount++;
            whereClause += ` AND (subject ILIKE $${paramCount} OR from_email ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
        }

        // Get emails
        const emailsResult = await db.query(`
      SELECT 
        id,
        from_email,
        from_name,
        subject,
        content,
        received_at,
        status,
        is_read,
        thread_id,
        reply_to_email,
        client_id,
        application_email_id
      FROM email_inbox
      ${whereClause}
      ORDER BY received_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...queryParams, limit, offset]);

        // Get total count
        const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM email_inbox
      ${whereClause}
    `, queryParams);

        return NextResponse.json({
            success: true,
            data: {
                emails: emailsResult.rows,
                pagination: {
                    page,
                    limit,
                    total: parseInt(countResult.rows[0].total),
                    pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching inbox emails:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch inbox emails' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            from_email,
            from_name,
            subject,
            content,
            reply_to_email,
            client_id,
            application_email_id
        } = body;

        // Generate thread ID if not provided
        const thread_id = body.thread_id || `thread_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        const result = await db.query(`
      INSERT INTO email_inbox (
        from_email, from_name, subject, content, reply_to_email,
        client_id, application_email_id, thread_id, status, is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'unread', false)
      RETURNING id
    `, [from_email, from_name, subject, content, reply_to_email, client_id, application_email_id, thread_id]);

        return NextResponse.json({
            success: true,
            data: { id: result.rows[0].id }
        });
    } catch (error) {
        console.error('Error creating inbox email:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create inbox email' },
            { status: 500 }
        );
    }
}

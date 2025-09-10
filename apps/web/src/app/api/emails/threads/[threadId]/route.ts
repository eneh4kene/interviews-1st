import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';

export async function GET(
    request: NextRequest,
    { params }: { params: { threadId: string } }
) {
    try {
        const { threadId } = params;

        // Get all emails in the thread
        const result = await db.query(`
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
      WHERE thread_id = $1
      ORDER BY received_at ASC
    `, [threadId]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Thread not found' },
                { status: 404 }
            );
        }

        // Mark all emails in thread as read
        await db.query(
            'UPDATE email_inbox SET is_read = true WHERE thread_id = $1',
            [threadId]
        );

        return NextResponse.json({
            success: true,
            data: {
                thread_id: threadId,
                emails: result.rows
            }
        });
    } catch (error) {
        console.error('Error fetching email thread:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch email thread' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { threadId: string } }
) {
    try {
        const { threadId } = params;
        const body = await request.json();
        const { content, subject } = body;

        // Get the original email to reply to
        const originalEmail = await db.query(
            'SELECT * FROM email_inbox WHERE thread_id = $1 ORDER BY received_at ASC LIMIT 1',
            [threadId]
        );

        if (originalEmail.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Thread not found' },
                { status: 404 }
            );
        }

        const original = originalEmail.rows[0];

        // Create reply
        const result = await db.query(`
      INSERT INTO email_inbox (
        from_email, from_name, subject, content, reply_to_email,
        client_id, application_email_id, thread_id, status, is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sent', true)
      RETURNING id
    `, [
            original.reply_to_email,
            'Interviews First',
            `Re: ${subject || original.subject}`,
            content,
            original.from_email,
            original.client_id,
            original.application_email_id,
            threadId
        ]);

        return NextResponse.json({
            success: true,
            data: { id: result.rows[0].id }
        });
    } catch (error) {
        console.error('Error creating reply:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create reply' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            from_email,
            from_name,
            subject,
            content,
            to_email = 'support@interviewsfirst.com'
        } = body;

        // Generate thread ID
        const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        // Try to find associated client
        let clientId = null;
        if (to_email) {
            const clientResult = await db.query(
                'SELECT id FROM clients WHERE email = $1',
                [to_email]
            );
            if (clientResult.rows.length > 0) {
                clientId = clientResult.rows[0].id;
            }
        }

        // Store the email in inbox
        const result = await db.query(`
            INSERT INTO email_inbox (
                from_email, from_name, subject, content,
                reply_to_email, client_id, thread_id, status, is_read, received_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING id
        `, [
            from_email,
            from_name,
            subject,
            content || '',
            to_email,
            clientId,
            threadId,
            'unread',
            false
        ]);

        console.log(`📧 Test email added to inbox from ${from_email}: ${subject}`);

        return NextResponse.json({
            success: true,
            data: { id: result.rows[0].id }
        });

    } catch (error) {
        console.error('Error adding test email to inbox:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to add test email to inbox' },
            { status: 500 }
        );
    }
}

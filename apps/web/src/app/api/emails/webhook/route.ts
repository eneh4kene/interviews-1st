import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';

        let fromEmail, toEmail, subject, text, html, envelope;

        if (contentType.includes('application/json')) {
            // Handle JSON data (for testing)
            const body = await request.json();
            fromEmail = body.from || body.from_email;
            toEmail = body.to || body.to_email;
            subject = body.subject;
            text = body.text || body.content;
            html = body.html;
            envelope = body.envelope;
        } else {
            // Handle form data from SendGrid Inbound Parse
            const formData = await request.formData();
            fromEmail = formData.get('from') as string;
            toEmail = formData.get('to') as string;
            subject = formData.get('subject') as string;
            text = formData.get('text') as string;
            html = formData.get('html') as string;
            envelope = formData.get('envelope') as string;
        }

        // Parse envelope to get more details
        let envelopeData = {};
        try {
            envelopeData = JSON.parse(envelope || '{}');
        } catch (e) {
            console.log('Could not parse envelope:', e);
        }

        // Extract sender name from email
        const fromName = fromEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Generate thread ID based on subject or create new one
        const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        // Try to find associated client
        let clientId = null;
        if (toEmail) {
            const clientResult = await db.query(
                'SELECT id FROM clients WHERE email = $1',
                [toEmail]
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
            fromEmail,
            fromName,
            subject,
            text || html || '',
            toEmail,
            clientId,
            threadId,
            'unread',
            false
        ]);

        console.log(`📧 Received email from ${fromEmail} to ${toEmail}: ${subject}`);

        return NextResponse.json({
            success: true,
            data: { id: result.rows[0].id }
        });

    } catch (error) {
        console.error('Error processing email webhook:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process email webhook' },
            { status: 500 }
        );
    }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
    return NextResponse.json({ status: 'Email webhook endpoint active' });
}

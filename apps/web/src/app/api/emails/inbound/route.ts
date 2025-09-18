import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';

// Handle incoming emails via SendGrid Inbound Parse
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();


        // Extract email data from SendGrid webhook
        const from = formData.get('from') as string;
        const to = formData.get('to') as string;
        const subject = formData.get('subject') as string;
        const text = formData.get('text') as string;
        const html = formData.get('html') as string;
        const headers = formData.get('headers') as string;

        console.log(`📧 Inbound email received: ${from} -> ${to}`);
        console.log(`Subject: ${subject}`);

        // Parse the recipient email(s) to find the client.
        // Prefer the envelope's "to" array when present, otherwise parse the "to" header
        // which can include display names (e.g., "Name <email@domain>") and multiple recipients.
        const normalizedRecipients: string[] = [];
        try {
            const envelope = formData.get('envelope') as string | null;
            if (envelope) {
                const env = JSON.parse(envelope);
                if (Array.isArray(env.to)) {
                    for (const r of env.to) {
                        if (typeof r === 'string') normalizedRecipients.push(r.toLowerCase().trim());
                    }
                }
            }
        } catch (e) {
            console.log('⚠ Failed to parse envelope JSON');
        }

        if (normalizedRecipients.length === 0 && to) {
            const tokens = to.split(',');
            for (const token of tokens) {
                const trimmed = token.trim();
                const match = trimmed.match(/<([^>]+)>/);
                const addr = (match ? match[1] : trimmed).toLowerCase();
                normalizedRecipients.push(addr);
            }
        }

        // Keep only our domain
        const ifRecipients = normalizedRecipients.filter(e => e.endsWith('@interviewsfirst.com'));
        if (ifRecipients.length === 0) {
            console.log('❌ No valid interviewsfirst.com recipient found');
            return NextResponse.json({ success: false, error: 'Invalid recipient' }, { status: 400 });
        }

        // Try to find a matching client by sender_email, then fall back to client_emails
        let client: any | null = null;
        let matchedRecipient = '';
        for (const rcpt of ifRecipients) {
            const bySender = await db.query(
                'SELECT id, name, worker_id FROM clients WHERE LOWER(sender_email) = $1',
                [rcpt]
            );
            if (bySender.rows.length > 0) {
                client = bySender.rows[0];
                matchedRecipient = rcpt;
                break;
            }

            const byClientEmail = await db.query(
                'SELECT c.id, c.name, c.worker_id FROM client_emails ce JOIN clients c ON c.id = ce.client_id WHERE LOWER(ce.from_email) = $1 AND ce.is_active = true',
                [rcpt]
            );
            if (byClientEmail.rows.length > 0) {
                client = byClientEmail.rows[0];
                matchedRecipient = rcpt;
                break;
            }
        }

        if (!client) {
            console.log(`❌ No client found for recipients: ${normalizedRecipients.join(', ')}`);
            return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
        }

        console.log(`✅ Matched recipient ${matchedRecipient}`);
        console.log(`✅ Found client: ${client.name} (${client.id})`);
        console.log(`✅ Found client: ${client.name} (${client.id})`);

        // Store the incoming email in the client's inbox
        await db.query(`
      INSERT INTO email_inbox (
        client_id, from_email, from_name, subject, content, 
        html_content, received_at, is_read, thread_id
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), false, $7)
    `, [
            client.id,
            from,
            from.split('@')[0], // Extract name from email
            subject,
            text || '',
            html || '',
            `thread_${client.id}_${Date.now()}` // Generate thread ID
        ]);

        console.log(`✅ Email stored in inbox for client: ${client.name}`);

        // TODO: Notify the worker assigned to this client
        // This could be done via:
        // - Real-time notifications (WebSocket)
        // - Email notification to worker
        // - Push notification
        // - Database trigger

        return NextResponse.json({
            success: true,
            message: 'Email processed successfully',
            clientId: client.id,
            clientName: client.name
        });

    } catch (error) {
        console.error('❌ Error processing inbound email:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to process email: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

// Handle GET requests (for webhook verification)
export async function GET(request: NextRequest) {
    return NextResponse.json({
        success: true,
        message: 'Inbound email webhook is active'
    });
}

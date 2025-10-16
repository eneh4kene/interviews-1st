/**
 * MANUAL REPLY PROCESSING - For testing inbound emails without SendGrid setup
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        console.log('📧 Manual reply processing endpoint called');

        const body = await request.json();
        const { from, to, subject, content, htmlContent } = body;

        console.log('📬 Manual reply details:');
        console.log('  From:', from);
        console.log('  To:', to);
        console.log('  Subject:', subject);
        console.log('  Content length:', content?.length || 0);

        if (!from || !to || !subject || !content) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: from, to, subject, content'
            }, { status: 400 });
        }

        // Get database connection
        const { db } = await import('@/lib/utils/database');

        // Find the client based on the 'to' email address
        let clientId: string | null = null;

        // Check if the 'to' email matches a client email
        const clientEmailResult = await db.query(
            'SELECT client_id, from_name FROM client_emails WHERE LOWER(from_email) = LOWER($1) AND is_active = TRUE',
            [to]
        );

        if (clientEmailResult.rows.length > 0) {
            clientId = clientEmailResult.rows[0].client_id;
            console.log(`✅ Found client ${clientId} for email ${to}`);
        } else {
            console.warn(`⚠️ No client found for email ${to}`);
            return NextResponse.json({
                success: false,
                error: `No client found for email ${to}`
            }, { status: 404 });
        }

        // Generate a thread ID (for now, use a simple format)
        const threadId = `thread_${clientId}_${Date.now()}`;

        // Store the inbound email in the inbox
        const result = await db.query(`
      INSERT INTO email_inbox (
        thread_id, client_id, from_email, from_name, subject, content, html_content,
        status, is_read, received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id
    `, [
            threadId,
            clientId,
            from,
            from.split('@')[0], // Simple name extraction
            subject,
            content,
            htmlContent || content,
            'unread',
            false
        ]);

        const emailId = result.rows[0].id;
        console.log(`✅ Manual reply stored with ID: ${emailId}`);

        return NextResponse.json({
            success: true,
            data: {
                message: 'Manual reply processed successfully',
                emailId: emailId,
                clientId: clientId
            }
        });

    } catch (error: any) {
        console.error('❌ Error processing manual reply:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to process manual reply'
        }, { status: 500 });
    }
}


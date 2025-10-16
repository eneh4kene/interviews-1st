/**
 * TEST REPLY ENDPOINT - Simple way to test reply processing
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        console.log('📧 Test reply endpoint called');

        const body = await request.json();
        const { from, to, subject, content } = body;

        // Default values for testing
        const replyData = {
            from: from || 'kene4eneh@gmail.com',
            to: to || 'testclient@interviewsfirst.com',
            subject: subject || 'Re: Test Email - Manual Reply',
            content: content || 'This is a test reply to verify the inbound email processing system is working correctly.',
            htmlContent: `<p>${content || 'This is a test reply to verify the inbound email processing system is working correctly.'}</p>`
        };

        console.log('📬 Processing test reply:', replyData);

        // Get database connection
        const { db } = await import('@/lib/utils/database');

        // Find the client based on the 'to' email address
        let clientId: string | null = null;

        const clientEmailResult = await db.query(
            'SELECT client_id, from_name FROM client_emails WHERE LOWER(from_email) = LOWER($1) AND is_active = TRUE',
            [replyData.to]
        );

        if (clientEmailResult.rows.length > 0) {
            clientId = clientEmailResult.rows[0].client_id;
            console.log(`✅ Found client ${clientId} for email ${replyData.to}`);
        } else {
            console.warn(`⚠️ No client found for email ${replyData.to}`);
            return NextResponse.json({
                success: false,
                error: `No client found for email ${replyData.to}`
            }, { status: 404 });
        }

        // Generate a thread ID
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
            replyData.from,
            replyData.from.split('@')[0],
            replyData.subject,
            replyData.content,
            replyData.htmlContent,
            'unread',
            false
        ]);

        const emailId = result.rows[0].id;
        console.log(`✅ Test reply stored with ID: ${emailId}`);

        return NextResponse.json({
            success: true,
            data: {
                message: 'Test reply processed successfully',
                emailId: emailId,
                clientId: clientId,
                replyData: replyData
            }
        });

    } catch (error: any) {
        console.error('❌ Error processing test reply:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to process test reply'
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: 'Test reply endpoint - POST to process a test reply',
        usage: {
            method: 'POST',
            body: {
                from: 'sender@example.com (optional)',
                to: 'testclient@interviewsfirst.com (optional)',
                subject: 'Re: Test Email (optional)',
                content: 'Reply content (optional)'
            }
        }
    });
}


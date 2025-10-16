/**
 * INBOUND EMAIL WEBHOOK - Receive emails from SendGrid
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanQuotedText, cleanQuotedHtml } from '@/lib/utils/emailCleaner';

export async function POST(request: NextRequest) {
    try {
        console.log('📧 Inbound email webhook received');

        // Parse the form data from SendGrid
        const formData = await request.formData();

        const from = formData.get('from')?.toString();
        const to = formData.get('to')?.toString();
        const subject = formData.get('subject')?.toString();
        const text = formData.get('text')?.toString();
        const html = formData.get('html')?.toString();

        // Process attachments if any
        const attachments: Array<{
            id: string;
            name: string;
            url: string;
            size: number;
            type: string;
            content?: string; // Keep base64 content for received emails
        }> = [];
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('attachment') && value instanceof File) {
                const file = value as File;
                const buffer = await file.arrayBuffer();
                const base64Content = Buffer.from(buffer).toString('base64');
                attachments.push({
                    id: `received_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    url: `data:${file.type};base64,${base64Content}`, // Create data URL for display
                    size: file.size,
                    type: file.type,
                    content: base64Content // Keep original base64 for storage
                });
                console.log(`📎 Processed attachment: ${file.name} (${file.size} bytes)`);
            }
        }

        console.log('📬 Inbound email details:');
        console.log('  From:', from);
        console.log('  To:', to);
        console.log('  Subject:', subject);
        console.log('  Text length:', text?.length || 0);
        console.log('  HTML length:', html?.length || 0);

        if (!from || !to || !subject || (!text && !html)) {
            console.error('❌ Missing required fields in inbound email');
            return NextResponse.json({
                success: false,
                error: 'Missing required fields'
            }, { status: 400 });
        }

        // Get database connection
        const { db } = await import('@/lib/utils/database');

        // Find the client based on the 'to' email address
        let clientId: string | null = null;

        // Extract email address from formatted string (e.g., "Test Client <testclient@interviewsfirst.com>" -> "testclient@interviewsfirst.com")
        const extractEmail = (emailString: string): string => {
            const match = emailString.match(/<([^>]+)>/);
            return match ? match[1] : emailString;
        };

        const cleanToEmail = extractEmail(to);
        console.log(`📧 Extracted email: ${cleanToEmail} from: ${to}`);

        // Check if the 'to' email matches a client email
        const clientEmailResult = await db.query(
            'SELECT client_id, from_name FROM client_emails WHERE LOWER(from_email) = LOWER($1) AND is_active = TRUE',
            [cleanToEmail]
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

        // Clean up the email content
        const cleanedText = cleanQuotedText(text || '');
        const cleanedHtml = cleanQuotedHtml(html || '');

        // Store the inbound email in the inbox
        const result = await db.query(`
      INSERT INTO email_inbox (
        thread_id, client_id, from_email, from_name, subject, content, html_content,
        status, is_read, received_at, attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
      RETURNING id
    `, [
            threadId,
            clientId,
            from,
            from.split('@')[0], // Simple name extraction
            subject,
            cleanedText || cleanedHtml || '',
            cleanedHtml || cleanedText || '',
            'unread',
            false,
            attachments.length > 0 ? JSON.stringify(attachments) : null
        ]);

        const emailId = result.rows[0].id;
        console.log(`✅ Inbound email stored with ID: ${emailId}`);

        return NextResponse.json({
            success: true,
            data: {
                message: 'Inbound email processed successfully',
                emailId: emailId,
                clientId: clientId
            }
        });

    } catch (error: any) {
        console.error('❌ Error processing inbound email:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to process inbound email'
        }, { status: 500 });
    }
}

// For SendGrid webhook verification
export async function GET(request: NextRequest) {
    return NextResponse.json({
        status: 'Inbound email webhook endpoint active',
        timestamp: new Date().toISOString()
    });
}
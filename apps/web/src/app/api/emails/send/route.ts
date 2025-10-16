/**
 * SIMPLE EMAIL SEND API - BUILT FROM SCRATCH
 * No queues, no scheduling, no bullshit - just send emails immediately
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Simple email send API called');

        // Get request body
        const body = await request.json();
        const { clientId, to, cc, bcc, subject, content, htmlContent, attachments } = body;

        console.log('📧 Email request:', { clientId, to, subject });

        // Validate required fields
        if (!clientId || !to || !subject || !content) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: clientId, to, subject, content'
            }, { status: 400 });
        }

        // Get client info
        const { db } = await import('@/lib/utils/database');
        const clientResult = await db.query('SELECT id, name FROM clients WHERE id = $1', [clientId]);

        if (clientResult.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Client not found'
            }, { status: 404 });
        }

        const client = clientResult.rows[0];
        console.log(`📋 Client found: ${client.name} (${client.id})`);

        // Import SimpleEmailService dynamically
        const { SimpleEmailService } = await import('@/lib/services/SimpleEmailService');

        // Get or create client email
        const fromEmail = await SimpleEmailService.getClientEmail(clientId, client.name);
        console.log(`📧 Using from email: ${fromEmail}`);

        // Send email immediately
        const result = await SimpleEmailService.sendEmail({
            to,
            from: fromEmail,
            fromName: client.name,
            subject,
            text: content,
            html: htmlContent || content.replace(/\n/g, '<br>'),
            cc,
            bcc,
            attachments: attachments || []
        });

        if (!result.success) {
            console.error('❌ Email send failed:', result.error);
            return NextResponse.json({
                success: false,
                error: result.error || 'Failed to send email'
            }, { status: 500 });
        }

        // Save to inbox for tracking
        await SimpleEmailService.saveToInbox({
            clientId,
            fromEmail,
            fromName: client.name,
            subject,
            content,
            htmlContent: htmlContent || content.replace(/\n/g, '<br>'),
            messageType: 'sent'
        });

        console.log('✅ Email sent and saved successfully');

        return NextResponse.json({
            success: true,
            data: {
                message: 'Email sent successfully',
                messageId: result.messageId,
                fromEmail
            }
        });

    } catch (error: any) {
        console.error('❌ Error in simple email send API:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
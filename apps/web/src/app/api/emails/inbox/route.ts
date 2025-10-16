/**
 * EMAIL INBOX API - Fetch client email logs
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        console.log('📧 Email inbox API called');

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json({
                success: false,
                error: 'Client ID is required'
            }, { status: 400 });
        }

        console.log('🔍 Fetching emails for client:', clientId);

        // Get client info
        const { db } = await import('@/lib/utils/database');

        // Fetch emails from email_inbox table
        const result = await db.query(`
      SELECT 
        id,
        thread_id,
        from_email,
        from_name,
        subject,
        content,
        html_content,
        status,
        is_read,
        received_at,
        created_at,
        attachments
      FROM email_inbox 
      WHERE client_id = $1 
      ORDER BY received_at DESC, created_at DESC
    `, [clientId]);

        console.log(`📬 Found ${result.rows.length} emails for client ${clientId}`);

        // Transform the data to match the frontend format
        const emails = result.rows.map((row: any) => ({
            id: row.id,
            threadId: row.thread_id,
            from: row.from_email,
            fromName: row.from_name,
            subject: row.subject,
            body: row.content,
            htmlContent: row.html_content,
            status: row.status,
            isRead: row.is_read,
            receivedAt: row.received_at,
            createdAt: row.created_at,
            attachments: row.attachments ? (() => {
                const atts = typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments;
                // Handle both old and new attachment formats
                return atts.map((att: any) => {
                    if (att.size !== undefined) {
                        // New format - already has all required fields
                        return att;
                    } else {
                        // Old format - convert to new format
                        return {
                            id: `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            name: att.name,
                            url: `data:${att.type};base64,${att.content}`, // Create data URL
                            size: att.content ? Math.round(att.content.length * 0.75) : 0, // Estimate size from base64
                            type: att.type,
                            content: att.content // Keep original content
                        };
                    }
                });
            })() : [],
            // Determine if it's sent or received based on the from_email
            type: row.from_email.includes('@interviewsfirst.com') ? 'sent' : 'received'
        }));

        return NextResponse.json({
            success: true,
            data: emails
        });

    } catch (error: any) {
        console.error('❌ Error fetching email inbox:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch emails'
        }, { status: 500 });
    }
}


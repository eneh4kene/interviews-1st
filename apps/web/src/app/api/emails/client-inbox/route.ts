import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

// Get all emails (sent and received) for a specific client
export async function GET(request: NextRequest) {
    try {
        // Authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response: ApiResponse = {
                success: false,
                error: 'No valid authorization token',
            };
            return NextResponse.json(response, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        // Get clientId from query params
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json({
                success: false,
                error: 'Client ID is required'
            }, { status: 400 });
        }

        // For WORKER role, validate that they have access to the specified client
        if (decoded.role === 'WORKER') {
            const clientCheck = await db.query(
                'SELECT id FROM clients WHERE id = $1 AND worker_id = $2',
                [clientId, decoded.userId]
            );

            if (clientCheck.rows.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: 'Access denied: You can only view emails for your assigned clients'
                }, { status: 403 });
            }
        }

        // Fetch sent emails from email_queue
        const sentEmailsQuery = `
            SELECT 
                eq.id,
                eq.to_email as to,
                eq.from_email as from,
                eq.subject,
                eq.html_content as body,
                eq.text_content,
                eq.status,
                eq.created_at,
                eq.attachments,
                'sent' as email_type
            FROM email_queue eq
            LEFT JOIN client_email_relationships cer ON eq.id = cer.email_queue_id
            WHERE cer.client_id = $1
            ORDER BY eq.created_at DESC
        `;

        const sentEmailsResult = await db.query(sentEmailsQuery, [clientId]);

        // Fetch received emails from email_inbox
        const receivedEmailsQuery = `
            SELECT 
                ei.id,
                ei.from_email as from,
                c.sender_email as to,
                ei.subject,
                ei.content as body,
                ei.content as text_content,
                'received' as status,
                ei.received_at as created_at,
                '[]'::jsonb as attachments,
                'received' as email_type
            FROM email_inbox ei
            LEFT JOIN clients c ON ei.client_id = c.id
            WHERE ei.client_id = $1
            ORDER BY ei.received_at DESC
        `;

        const receivedEmailsResult = await db.query(receivedEmailsQuery, [clientId]);

        // Combine and format the results
        const allEmails = [
            ...sentEmailsResult.rows.map((email: any) => ({
                id: email.id,
                subject: email.subject,
                from: email.from,
                to: email.to,
                body: email.body || email.text_content || '',
                status: email.status === 'sent' ? 'sent' :
                    email.status === 'failed' ? 'failed' :
                        email.status === 'pending' ? 'draft' : 'sent',
                createdAt: email.created_at,
                attachments: email.attachments || [],
                isRead: email.status === 'sent' || email.status === 'failed',
                emailType: email.email_type
            })),
            ...receivedEmailsResult.rows.map((email: any) => ({
                id: email.id,
                subject: email.subject,
                from: email.from,
                to: email.to,
                body: email.body || email.text_content || '',
                status: 'received' as const,
                createdAt: email.created_at,
                attachments: email.attachments || [],
                isRead: false, // Received emails are unread by default
                emailType: email.email_type
            }))
        ];

        // Sort by creation date (newest first)
        allEmails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const response: ApiResponse = {
            success: true,
            data: allEmails
        };

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        console.error('Error fetching client emails:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to fetch emails: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

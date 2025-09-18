import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { emailService } from '@/lib/services/emailService';
import { ApiResponse } from '@interview-me/types';

// Get email queue
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

        // ADMIN, MANAGER, and WORKER can access email queue
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER' && decoded.role !== 'WORKER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'all';
        const clientId = searchParams.get('clientId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // For WORKER role, validate that they have access to the specified client
        if (decoded.role === 'WORKER' && clientId) {
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

        let whereClause = '';
        let params: any[] = [];
        let paramCount = 0;

        // For WORKER role, only show emails for the specified client
        if (decoded.role === 'WORKER' && clientId) {
            paramCount++;
            whereClause = `WHERE cer.client_id = $${paramCount}`;
            params.push(clientId);
        }

        if (status !== 'all') {
            paramCount++;
            whereClause += whereClause ? ` AND eq.status = $${paramCount}` : `WHERE eq.status = $${paramCount}`;
            params.push(status);
        }

        // Build the query based on whether we need the JOIN
        let query = '';
        if (decoded.role === 'WORKER' && clientId) {
            // Use JOIN for worker with clientId
            query = `
                SELECT eq.id, eq.to_email, eq.to_name, eq.from_email, eq.from_name, eq.subject, eq.status, eq.priority, 
                       eq.scheduled_at, eq.sent_at, eq.error_message, eq.retry_count, eq.created_at,
                       eq.html_content, eq.text_content, eq.cc, eq.bcc, eq.attachments
                FROM email_queue eq
                LEFT JOIN client_email_relationships cer ON eq.id = cer.email_queue_id
                ${whereClause}
                ORDER BY eq.priority DESC, eq.scheduled_at ASC
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;
        } else {
            // Use simple query for admin/manager or worker without clientId
            query = `
                SELECT id, to_email, to_name, from_email, from_name, subject, status, priority, 
                       scheduled_at, sent_at, error_message, retry_count, created_at,
                       html_content, text_content, cc, bcc, attachments
                FROM email_queue
                ${whereClause}
                ORDER BY priority DESC, scheduled_at ASC
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;
        }

        const result = await db.query(query, [...params, limit, offset]);

        // Build count query based on whether we need the JOIN
        let countQuery = '';
        if (decoded.role === 'WORKER' && clientId) {
            countQuery = `
                SELECT COUNT(*) as total
                FROM email_queue eq
                LEFT JOIN client_email_relationships cer ON eq.id = cer.email_queue_id
                ${whereClause}
            `;
        } else {
            countQuery = `
                SELECT COUNT(*) as total
                FROM email_queue
                ${whereClause}
            `;
        }

        const countResult = await db.query(countQuery, params);

        const response: ApiResponse = {
            success: true,
            data: result.rows
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching email queue:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to fetch email queue: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

// Process email queue
export async function POST(request: NextRequest) {
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

        // Only ADMIN can process email queue
        if (decoded.role !== 'ADMIN') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        await emailService.processQueue();

        const response: ApiResponse = {
            success: true,
            data: { message: 'Email queue processed successfully' }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error processing email queue:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to process email queue'
        }, { status: 500 });
    }
}
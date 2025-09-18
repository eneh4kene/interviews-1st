import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

// Get client's email inbox
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'No valid authorization token'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        // Only ADMIN, MANAGER, and WORKER can access client inbox
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER' && decoded.role !== 'WORKER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const clientId = params.id;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Get emails from client's inbox
        const result = await db.query(`
      SELECT 
        id, from_email, from_name, subject, content, html_content,
        received_at, is_read, thread_id
      FROM email_inbox
      WHERE client_id = $1
      ORDER BY received_at DESC
      LIMIT $2 OFFSET $3
    `, [clientId, limit, offset]);

        // Get total count
        const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM email_inbox
      WHERE client_id = $1
    `, [clientId]);

        const response: ApiResponse = {
            success: true,
            data: {
                emails: result.rows,
                total: parseInt(countResult.rows[0].total),
                limit,
                offset
            }
        };

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        console.error('Error getting client inbox:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to get client inbox: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

// Mark email as read
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'No valid authorization token'
            }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        // Only ADMIN, MANAGER, and WORKER can mark emails as read
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER' && decoded.role !== 'WORKER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const clientId = params.id;
        const body = await request.json();
        const { emailId, isRead = true } = body;

        if (!emailId) {
            return NextResponse.json({
                success: false,
                error: 'Email ID is required'
            }, { status: 400 });
        }

        // Update email read status
        await db.query(`
      UPDATE email_inbox 
      SET is_read = $1, updated_at = NOW()
      WHERE id = $2 AND client_id = $3
    `, [isRead, emailId, clientId]);

        const response: ApiResponse = {
            success: true,
            data: { message: 'Email status updated successfully' }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error updating email status:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to update email status: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

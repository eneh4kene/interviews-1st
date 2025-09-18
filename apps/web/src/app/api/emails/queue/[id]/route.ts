import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

// Delete email from queue
export async function DELETE(
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

        // Only ADMIN, MANAGER, and WORKER can delete emails
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER' && decoded.role !== 'WORKER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const emailId = params.id;

        // Delete email from queue
        const result = await db.query(`
            DELETE FROM email_queue 
            WHERE id = $1
        `, [emailId]);

        if (result.rowCount === 0) {
            return NextResponse.json({
                success: false,
                error: 'Email not found'
            }, { status: 404 });
        }

        const response: ApiResponse = {
            success: true,
            data: { message: 'Email deleted successfully' }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error deleting email:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to delete email: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

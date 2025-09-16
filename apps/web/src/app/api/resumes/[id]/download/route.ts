import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'No valid authorization token' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        const resumeId = params.id;

        // Get resume details and verify access
        const { rows } = await db.query(`
            SELECT 
                r.id,
                r.name,
                r.file_url,
                c.worker_id
            FROM resumes r
            JOIN clients c ON r.client_id = c.id
            WHERE r.id = $1
        `, [resumeId]);

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Resume not found' },
                { status: 404 }
            );
        }

        // Non-admin users can only download resumes of their own clients
        if (decoded.role !== 'ADMIN' && rows[0].worker_id !== decoded.userId) {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        // Redirect to Vercel Blob URL
        return NextResponse.redirect(rows[0].file_url);
    } catch (error) {
        console.error('Download resume error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to download resume' },
            { status: 500 }
        );
    }
}

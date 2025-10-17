import { verifyToken } from "@/lib/utils/jwt";
import { NextRequest, NextResponse } from 'next/server';
import { aiResumeService } from '@/lib/services/AiResumeService';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authenticate user
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "No valid authorization token" },
                { status: 401 }
            );
        }
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        const { id } = params;

        // Get resume generation status
        console.log('🔍 Getting resume status for ID:', id);
        const resume = await aiResumeService.getResumeStatus(id);
        console.log('📊 Resume status result:', resume);

        if (!resume) {
            console.log('❌ Resume generation not found for ID:', id);
            return NextResponse.json({ success: false, error: 'Resume generation not found' }, { status: 404 });
        }

        // Check permissions - user must be the worker who owns the client or an admin
        if (decoded.role !== 'ADMIN') {
            // Get the worker_id from the client relationship
            const { db } = await import('@/lib/utils/database');
            const clientResult = await db.query(
                'SELECT worker_id FROM clients WHERE id = $1',
                [resume.client_id]
            );

            if (clientResult.rows.length === 0 || clientResult.rows[0].worker_id !== decoded.userId) {
                return NextResponse.json(
                    { success: false, error: 'Access denied' },
                    { status: 403 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                id: resume.id,
                status: resume.status,
                progress: resume.progress,
                generated_resume_url: resume.generated_resume_url,
                generated_resume_filename: resume.generated_resume_filename,
                error_message: resume.error_message,
                created_at: resume.created_at,
                updated_at: resume.updated_at
            }
        });

    } catch (error) {
        console.error('Error getting resume status:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { db } from '@/lib/utils/database';

export async function GET(
    request: NextRequest,
    { params }: { params: { clientId: string } }
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

        const { clientId } = params;

        // Check permissions
        if (decoded.role === 'CLIENT' && decoded.userId !== clientId) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Get AI applications
        const aiApplicationsResult = await db.query(`
            SELECT 
                id,
                client_id,
                worker_id,
                job_id,
                job_title,
                company_name,
                company_website,
                status,
                progress,
                wait_for_approval,
                retry_count,
                max_retries,
                error_message,
                ai_generated_content,
                worker_notes,
                target_email,
                email_confidence_score,
                alternative_emails,
                created_at,
                updated_at,
                'ai' as application_type
            FROM ai_applications 
            WHERE client_id = $1
            ORDER BY created_at DESC
        `, [clientId]);

        // Get manual applications (including those with resume generation)
        const manualApplicationsResult = await db.query(`
            SELECT 
                id,
                client_id,
                job_id,
                job_title,
                company_name,
                company_website,
                apply_url,
                application_type,
                resume_id,
                notes,
                application_date,
                status,
                interview_date,
                resume_generation_status,
                resume_generation_progress,
                generated_resume_url,
                generated_resume_filename,
                resume_generation_error,
                resume_generation_retry_count,
                resume_generation_max_retries,
                created_at,
                updated_at,
                'manual' as application_type
            FROM applications 
            WHERE client_id = $1
            ORDER BY created_at DESC
        `, [clientId]);

        // Combine and sort by creation date
        const allApplications = [
            ...aiApplicationsResult.rows.map(row => ({
                ...row,
                application_type: 'ai'
            })),
            ...manualApplicationsResult.rows.map(row => ({
                ...row,
                application_type: 'manual'
            }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Calculate stats
        const stats = {
            total: allApplications.length,
            ai_applications: aiApplicationsResult.rows.length,
            manual_applications: manualApplicationsResult.rows.length,
            resume_generation_pending: manualApplicationsResult.rows.filter(app =>
                app.resume_generation_status &&
                ['queued', 'processing', 'generating'].includes(app.resume_generation_status)
            ).length,
            resume_generation_completed: manualApplicationsResult.rows.filter(app =>
                app.resume_generation_status === 'completed'
            ).length,
            resume_generation_failed: manualApplicationsResult.rows.filter(app =>
                app.resume_generation_status === 'failed'
            ).length
        };

        return NextResponse.json({
            success: true,
            data: {
                applications: allApplications,
                stats
            },
            message: 'Unified applications retrieved successfully'
        });

    } catch (error) {
        console.error('Error getting unified applications:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

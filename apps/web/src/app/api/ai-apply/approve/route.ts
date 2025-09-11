// AI Apply Approve API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { aiApplyService, ApplicationEdits } from '@/lib/services/AiApplyService';
import { authMiddleware } from '@/lib/middleware/auth-nextjs';

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const authResult = await authMiddleware(request);
        if (!authResult.success) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const user = authResult.user;

        // Only workers and admins can approve AI applications
        if (user.role !== 'WORKER' && user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { application_id, edits } = body;

        // Validate required fields
        if (!application_id) {
            return NextResponse.json(
                { success: false, error: 'Application ID is required' },
                { status: 400 }
            );
        }

        // Validate edits if provided
        let applicationEdits: ApplicationEdits | undefined;
        if (edits) {
            applicationEdits = {
                target_email: edits.target_email,
                email_subject: edits.email_subject,
                email_body: edits.email_body,
                resume_content: edits.resume_content,
                worker_notes: edits.worker_notes
            };
        }

        // Approve application
        const result = await aiApplyService.approveApplication(application_id, applicationEdits);

        if (result.success) {
            return NextResponse.json({
                success: true,
                data: {
                    message: 'AI application approved successfully'
                }
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Error in AI apply approve API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

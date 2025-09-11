// AI Apply Submit API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { aiApplyService, ApplicationSubmissionData } from '@/lib/services/AiApplyService';
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

        // Only workers and admins can submit AI applications
        if (user.role !== 'WORKER' && user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const {
            client_id,
            job_id,
            job_title,
            company_name,
            company_website,
            wait_for_approval,
            worker_notes
        } = body;

        // Validate required fields
        if (!client_id || !job_id || !job_title || !company_name) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Prepare application data
        const applicationData: ApplicationSubmissionData = {
            client_id,
            worker_id: user.id,
            job_id,
            job_title,
            company_name,
            company_website,
            wait_for_approval: wait_for_approval || false,
            worker_notes
        };

        // Submit application
        const result = await aiApplyService.submitApplication(applicationData);

        if (result.success) {
            return NextResponse.json({
                success: true,
                data: {
                    application_id: result.application_id,
                    message: 'AI application submitted successfully'
                }
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Error in AI apply submit API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

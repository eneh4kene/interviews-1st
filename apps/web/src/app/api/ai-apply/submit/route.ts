import { verifyToken } from "@/lib/utils/jwt";
// AI Apply Submit API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { aiApplyService, ApplicationSubmissionData } from '@/lib/services/AiApplyService';

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
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

        // Only workers and admins can submit AI applications
        if (decoded.role !== 'WORKER' && decoded.role !== 'ADMIN') {
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
            worker_id: decoded.userId,
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

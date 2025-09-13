import { verifyToken } from "@/lib/utils/jwt";
// AI Apply Approve API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { aiApplyService, ApplicationEdits } from '@/lib/services/AiApplyService';

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

        // Only workers and admins can approve AI applications
        if (decoded.role !== 'WORKER' && decoded.role !== 'ADMIN') {
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

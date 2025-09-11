// AI Apply Reject API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { aiApplyService } from '@/lib/services/AiApplyService';
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

        // Only workers and admins can reject AI applications
        if (user.role !== 'WORKER' && user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { application_id, reason } = body;

        // Validate required fields
        if (!application_id) {
            return NextResponse.json(
                { success: false, error: 'Application ID is required' },
                { status: 400 }
            );
        }

        if (!reason || reason.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Rejection reason is required' },
                { status: 400 }
            );
        }

        // Reject application
        const result = await aiApplyService.rejectApplication(application_id, reason);

        if (result.success) {
            return NextResponse.json({
                success: true,
                data: {
                    message: 'AI application rejected successfully'
                }
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Error in AI apply reject API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

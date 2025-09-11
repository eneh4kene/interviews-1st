// AI Apply Single Application API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { aiApplyService } from '@/lib/services/AiApplyService';
import { authMiddleware } from '@/lib/middleware/auth-nextjs';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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
        const { id } = params;

        // Get application
        const application = await aiApplyService.getApplication(id);

        if (!application) {
            return NextResponse.json(
                { success: false, error: 'Application not found' },
                { status: 404 }
            );
        }

        // Check permissions
        if (user.role === 'CLIENT' && user.id !== application.client_id) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        if (user.role === 'WORKER' && user.id !== application.worker_id) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { application }
        });

    } catch (error) {
        console.error('Error in AI apply application API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

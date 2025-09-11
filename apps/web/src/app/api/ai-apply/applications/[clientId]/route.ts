// AI Apply Applications by Client API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { aiApplyService } from '@/lib/services/AiApplyService';
import { authMiddleware } from '@/lib/middleware/auth-nextjs';

export async function GET(
    request: NextRequest,
    { params }: { params: { clientId: string } }
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
        const { clientId } = params;

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        // Check permissions
        if (user.role === 'CLIENT' && user.id !== clientId) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Get applications for client
        const applications = await aiApplyService.getClientApplications(
            clientId,
            status || undefined
        );

        return NextResponse.json({
            success: true,
            data: {
                applications,
                count: applications.length
            }
        });

    } catch (error) {
        console.error('Error in AI apply applications API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

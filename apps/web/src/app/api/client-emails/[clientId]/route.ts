// Client Emails API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { clientEmailService } from '@/lib/services/ClientEmailService';
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

        // Check permissions
        if (user.role === 'CLIENT' && user.id !== clientId) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Get client emails
        const emails = await clientEmailService.getClientEmails(clientId);

        return NextResponse.json({
            success: true,
            data: { emails }
        });

    } catch (error) {
        console.error('Error in client emails API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
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

        // Only workers and admins can create client emails
        if (user.role !== 'WORKER' && user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { from_name, reply_to_email } = body;

        // Validate required fields
        if (!from_name) {
            return NextResponse.json(
                { success: false, error: 'From name is required' },
                { status: 400 }
            );
        }

        // Create client email
        const email = await clientEmailService.createClientEmail({
            client_id: clientId,
            from_name,
            reply_to_email
        });

        return NextResponse.json({
            success: true,
            data: { email }
        });

    } catch (error) {
        console.error('Error creating client email:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { emailService } from '@/lib/services/emailService';
import { ApiResponse } from '@interview-me/types';

// Send welcome email to client
export async function POST(
    request: NextRequest,
    { params }: { params: { clientId: string } }
) {
    try {
        // Authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response: ApiResponse = {
                success: false,
                error: 'No valid authorization token',
            };
            return NextResponse.json(response, { status: 401 });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        const clientId = params.clientId;

        const success = await emailService.sendWelcomeEmail(clientId);

        if (success) {
            const response: ApiResponse = {
                success: true,
                data: { message: 'Welcome email sent successfully' }
            };
            return NextResponse.json(response);
        } else {
            return NextResponse.json({
                success: false,
                error: 'Failed to send welcome email'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to send welcome email'
        }, { status: 500 });
    }
}

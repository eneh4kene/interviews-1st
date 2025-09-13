import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { emailService } from '@/lib/services/emailService';
import { ApiResponse } from '@interview-me/types';

// Send interview scheduled email
export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { clientId, interviewData } = body;

        if (!clientId || !interviewData) {
            return NextResponse.json({
                success: false,
                error: 'Client ID and interview data are required'
            }, { status: 400 });
        }

        const success = await emailService.sendInterviewScheduledEmail(clientId, interviewData);

        if (success) {
            const response: ApiResponse = {
                success: true,
                data: { message: 'Interview scheduled email sent successfully' }
            };
            return NextResponse.json(response);
        } else {
            return NextResponse.json({
                success: false,
                error: 'Failed to send interview scheduled email'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error sending interview scheduled email:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to send interview scheduled email'
        }, { status: 500 });
    }
}

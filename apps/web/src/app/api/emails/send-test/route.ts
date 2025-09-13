import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { emailService } from '@/lib/services/emailService';
import { ApiResponse } from '@interview-me/types';

// Send test email
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

        // Only ADMIN and MANAGER can send test emails
        if (decoded.role !== 'ADMIN' && decoded.role !== 'MANAGER') {
            return NextResponse.json({
                success: false,
                error: 'Insufficient permissions'
            }, { status: 403 });
        }

        const body = await request.json();
        const { to_email, to_name, template_name, variables = {} } = body;

        if (!to_email || !template_name) {
            return NextResponse.json({
                success: false,
                error: 'To email and template name are required'
            }, { status: 400 });
        }

        const emailId = await emailService.queueEmail(
            to_email,
            to_name || 'Test User',
            template_name,
            variables,
            10 // High priority for test emails
        );

        const response: ApiResponse = {
            success: true,
            data: { emailId, message: 'Test email queued successfully' }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error sending test email:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to send test email'
        }, { status: 500 });
    }
}

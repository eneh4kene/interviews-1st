import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';
import { emailService } from '@/lib/services/emailService';
import { ApiResponse } from '@interview-me/types';

// Send direct email via SendGrid
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
        const { to, cc, bcc, subject, body: emailBody, from, attachments = [], clientId } = body;

        if (!to || !subject || !emailBody) {
            return NextResponse.json({
                success: false,
                error: 'To, subject, and body are required'
            }, { status: 400 });
        }

        // Create email data for the queue
        const emailData = {
            to_email: to,
            to_name: to.split('@')[0], // Extract name from email
            from_email: from || process.env.VERIFIED_SENDER_EMAIL || 'interviewsfirst@gmail.com',
            from_name: 'InterviewsFirst',
            subject: subject,
            html_content: emailBody.replace(/\n/g, '<br>'), // Convert line breaks to HTML
            text_content: emailBody,
            cc: cc || '',
            bcc: bcc || '',
            attachments: attachments || [],
            client_id: clientId
        };

        // Queue the email for immediate processing
        const emailId = await emailService.queueDirectEmail(emailData);

        const response: ApiResponse = {
            success: true,
            data: {
                emailId,
                message: 'Email queued and will be sent shortly',
                to: to,
                subject: subject
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error sending direct email:', error);
        return NextResponse.json({
            success: false,
            error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

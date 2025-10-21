/**
 * SEND TEMPLATE EMAIL API
 * Sends emails using templates with variable substitution
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';

export async function POST(request: NextRequest) {
    try {
        console.log('📧 Send template email API called');

        // Get request body
        const body = await request.json();
        const { to, toName, templateName, variables, clientId } = body;

        console.log('📧 Template email request:', { to, templateName, clientId });

        // Validate required fields
        if (!to || !templateName || !variables) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: to, templateName, variables'
            }, { status: 400 });
        }

        // Import SimpleEmailService dynamically
        const { SimpleEmailService } = await import('@/lib/services/SimpleEmailService');

        // Send email using template
        const result = await SimpleEmailService.sendTemplateEmail({
            to,
            toName: toName || 'Valued Client',
            templateName,
            variables,
            clientId: clientId || '1' // Default client ID for testing
        });

        if (!result.success) {
            console.error('❌ Template email send failed:', result.error);
            return NextResponse.json({
                success: false,
                error: result.error || 'Failed to send template email'
            }, { status: 500 });
        }

        console.log('✅ Template email sent successfully');

        return NextResponse.json({
            success: true,
            data: {
                message: 'Template email sent successfully',
                messageId: result.messageId
            }
        });

    } catch (error: any) {
        console.error('❌ Error in send template email API:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}

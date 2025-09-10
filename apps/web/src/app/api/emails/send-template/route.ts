import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/database';
import { ApiResponse } from '@interview-me/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to_email, to_name, template_name, variables } = body;

        if (!to_email || !template_name) {
            return NextResponse.json({
                success: false,
                error: 'Email address and template name are required'
            }, { status: 400 });
        }

        // Get the template from database
        const templateResult = await db.query(
            'SELECT * FROM email_templates WHERE name = $1 AND is_active = true',
            [template_name]
        );

        if (templateResult.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Template not found or inactive'
            }, { status: 404 });
        }

        const template = templateResult.rows[0];

        // Replace variables in subject and content
        let subject = template.subject;
        let htmlContent = template.html_content || '';
        let textContent = template.text_content || '';

        // Replace variables with actual values
        if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                subject = subject.replace(regex, String(value));
                htmlContent = htmlContent.replace(regex, String(value));
                textContent = textContent.replace(regex, String(value));
            });
        }

        // Queue the email
        const queueResult = await db.query(`
            INSERT INTO email_queue (
                to_email, to_name, from_email, from_name, subject,
                html_content, text_content, variables, priority, scheduled_at, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 'pending')
            RETURNING id
        `, [
            to_email,
            to_name || 'Valued Client',
            process.env.VERIFIED_SENDER_EMAIL || 'interviewsfirst@gmail.com',
            'InterviewsFirst',
            subject,
            htmlContent,
            textContent,
            JSON.stringify(variables || {}),
            0 // Normal priority
        ]);

        // Process the email queue immediately
        try {
            const { emailService } = await import('@/lib/services/emailService');
            await emailService.processQueue();
        } catch (error) {
            console.error('Error processing email queue:', error);
            // Don't fail the request if queue processing fails
        }

        const response: ApiResponse = {
            success: true,
            data: {
                message: 'Email queued and processed successfully',
                queueId: queueResult.rows[0].id
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error sending template email:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to send template email'
        }, { status: 500 });
    }
}

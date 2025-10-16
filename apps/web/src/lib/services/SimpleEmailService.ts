/**
 * ENHANCED EMAIL SERVICE - OPTIMIZED & CONSOLIDATED
 * Immediate email sending with essential features from the complex system
 */

import sgMail from '@sendgrid/mail';
import { db } from '@/lib/utils/database';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
    console.error('❌ SENDGRID_API_KEY not found in environment variables');
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    html_content: string;
    text_content?: string;
    variables: string[];
    category: string;
    is_active: boolean;
}

export class SimpleEmailService {

    /**
     * Send email immediately - no queues, no delays, no bullshit
     */
    static async sendEmail(params: {
        to: string;
        from: string;
        fromName?: string;
        subject: string;
        text: string;
        html?: string;
        cc?: string;
        bcc?: string;
        attachments?: Array<{
            id: string;
            name: string;
            url: string;
            size: number;
            type: string;
        }>;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {

        try {
            console.log(`🚀 Sending email to ${params.to} with subject: ${params.subject}`);

            // Clean up CC and BCC to prevent duplicates
            let cleanCC = params.cc;
            let cleanBCC = params.bcc;

            // Remove TO email from CC if it exists
            if (cleanCC && cleanCC.includes(params.to)) {
                cleanCC = cleanCC.split(',').map(email => email.trim()).filter(email => email !== params.to).join(',');
                console.log(`🧹 Removed duplicate TO email from CC: ${params.to}`);
            }

            // Remove TO email from BCC if it exists
            if (cleanBCC && cleanBCC.includes(params.to)) {
                cleanBCC = cleanBCC.split(',').map(email => email.trim()).filter(email => email !== params.to).join(',');
                console.log(`🧹 Removed duplicate TO email from BCC: ${params.to}`);
            }

            // Remove CC emails from BCC if they exist
            if (cleanCC && cleanBCC) {
                const ccEmails = cleanCC.split(',').map(email => email.trim());
                cleanBCC = cleanBCC.split(',').map(email => email.trim()).filter(email => !ccEmails.includes(email)).join(',');
            }

            // Only add CC/BCC if they have valid emails after cleanup
            const msg: any = {
                to: params.to,
                from: {
                    email: params.from,
                    name: params.fromName || 'Interview Me'
                },
                replyTo: {
                    email: params.from,
                    name: params.fromName || 'Interview Me'
                },
                subject: params.subject,
                text: params.text,
                html: params.html || params.text
            };

            if (cleanCC && cleanCC.trim()) {
                msg.cc = cleanCC;
            }
            if (cleanBCC && cleanBCC.trim()) {
                msg.bcc = cleanBCC;
            }

            // Process attachments if provided
            if (params.attachments && params.attachments.length > 0) {
                console.log(`📎 Processing ${params.attachments.length} attachments`);
                console.log(`📎 Attachment details:`, params.attachments.map(att => ({
                    name: att.name,
                    url: att.url,
                    size: att.size,
                    type: att.type
                })));

                const processedAttachments = [];

                for (const attachment of params.attachments) {
                    try {
                        console.log(`📎 Fetching attachment: ${attachment.name} from ${attachment.url}`);

                        // Fetch the attachment content from the URL
                        const response = await fetch(attachment.url);
                        console.log(`📎 Fetch response status: ${response.status}`);

                        if (response.ok) {
                            const buffer = await response.arrayBuffer();
                            const base64Content = Buffer.from(buffer).toString('base64');

                            console.log(`📎 Attachment ${attachment.name}: ${buffer.byteLength} bytes, base64 length: ${base64Content.length}`);

                            processedAttachments.push({
                                content: base64Content,
                                filename: attachment.name,
                                type: attachment.type || 'application/octet-stream',
                                disposition: 'attachment'
                            });
                            console.log(`✅ Successfully processed attachment: ${attachment.name}`);
                        } else {
                            console.error(`❌ Failed to fetch attachment ${attachment.name}: ${response.status} ${response.statusText}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error processing attachment ${attachment.name}:`, error);
                    }
                }

                if (processedAttachments.length > 0) {
                    msg.attachments = processedAttachments;
                    console.log(`📎 Added ${processedAttachments.length} attachments to email`);
                    console.log(`📎 SendGrid message with attachments:`, JSON.stringify(msg, null, 2));
                } else {
                    console.warn(`⚠️ No attachments were successfully processed`);
                }
            }

            const response = await sgMail.send(msg);

            console.log(`✅ Email sent successfully to ${params.to}`);
            console.log(`📧 SendGrid Response: ${response[0].statusCode}`);
            console.log(`🆔 Message ID: ${response[0].headers['x-message-id']}`);

            return {
                success: true,
                messageId: response[0].headers['x-message-id']
            };

        } catch (error: any) {
            console.error(`❌ Failed to send email to ${params.to}:`, error);

            return {
                success: false,
                error: error.response ? JSON.stringify(error.response.body) : error.message
            };
        }
    }

    /**
     * Get or create client email address
     */
    static async getClientEmail(clientId: string, clientName: string): Promise<string> {
        try {
            // Check if client already has an email
            const existing = await db.query(
                'SELECT from_email FROM client_emails WHERE client_id = $1 AND is_active = TRUE',
                [clientId]
            );

            if (existing.rows.length > 0) {
                return existing.rows[0].from_email;
            }

            // Generate new email
            const baseName = clientName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
            let email = `${baseName}@interviewsfirst.com`;
            let counter = 1;

            // Make sure it's unique
            while (true) {
                const check = await db.query('SELECT COUNT(*) FROM client_emails WHERE from_email = $1', [email]);
                if (parseInt(check.rows[0].count) === 0) break;
                email = `${baseName}${counter}@interviewsfirst.com`;
                counter++;
            }

            // Create the email
            await db.query(
                'INSERT INTO client_emails (client_id, from_email, from_name, is_active) VALUES ($1, $2, $3, TRUE)',
                [clientId, email, clientName]
            );

            console.log(`✅ Created client email: ${email} for client ${clientName}`);
            return email;

        } catch (error) {
            console.error('❌ Error getting client email:', error);
            throw error;
        }
    }

    /**
     * Save email to client inbox (for tracking)
     */
    static async saveToInbox(params: {
        clientId: string;
        fromEmail: string;
        fromName: string;
        subject: string;
        content: string;
        htmlContent?: string;
        messageType: 'sent' | 'received';
    }): Promise<void> {
        try {
            const threadId = `thread_${params.clientId}_${Date.now()}`;

            await db.query(`
        INSERT INTO email_inbox (
          thread_id, client_id, from_email, from_name, subject, content, html_content,
          status, is_read, received_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
                threadId,
                params.clientId,
                params.fromEmail,
                params.fromName,
                params.subject,
                params.content,
                params.htmlContent,
                params.messageType === 'sent' ? 'read' : 'unread',
                params.messageType === 'sent'
            ]);

            console.log(`✅ Email saved to inbox for client ${params.clientId}`);

        } catch (error) {
            console.error('❌ Error saving to inbox:', error);
            // Don't throw - this is just for tracking
        }
    }

    /**
     * Get email template by name
     */
    static async getTemplate(templateName: string): Promise<EmailTemplate | null> {
        try {
            const result = await db.query(
                'SELECT * FROM email_templates WHERE name = $1 AND is_active = true',
                [templateName]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting email template:', error);
            return null;
        }
    }

    /**
     * Get template by category
     */
    static async getTemplateByCategory(category: string): Promise<EmailTemplate | null> {
        try {
            const result = await db.query(
                'SELECT * FROM email_templates WHERE category = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
                [category]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting template by category:', error);
            return null;
        }
    }

    /**
     * Render template with variables
     */
    static renderTemplate(template: EmailTemplate, variables: Record<string, any>): { subject: string; html: string; text: string } {
        let subject = template.subject;
        let html = template.html_content;
        let text = template.text_content || '';

        // Replace variables in template
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            const replacement = value || '';

            subject = subject.replace(new RegExp(placeholder, 'g'), replacement);
            html = html.replace(new RegExp(placeholder, 'g'), replacement);
            text = text.replace(new RegExp(placeholder, 'g'), replacement);
        });

        return { subject, html, text };
    }

    /**
     * Send email using template
     */
    static async sendTemplateEmail(params: {
        to: string;
        toName: string;
        templateName: string;
        variables: Record<string, any>;
        clientId?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const template = await this.getTemplate(params.templateName);
            if (!template) {
                return { success: false, error: `Template ${params.templateName} not found` };
            }

            const rendered = this.renderTemplate(template, params.variables);
            const fromEmail = params.clientId ? await this.getClientEmail(params.clientId, params.toName) :
                (process.env.VERIFIED_SENDER_EMAIL || 'applications@interviewsfirst.com');

            return await this.sendEmail({
                to: params.to,
                from: fromEmail,
                fromName: params.toName,
                subject: rendered.subject,
                text: rendered.text,
                html: rendered.html
            });

        } catch (error) {
            console.error('Error sending template email:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Process email queue (for backward compatibility)
     */
    static async processQueue(): Promise<void> {
        try {
            console.log('🔄 Processing email queue...');

            const result = await db.query(`
                SELECT * FROM email_queue 
                WHERE status = 'pending' 
                AND (scheduled_at IS NULL OR scheduled_at <= NOW())
                ORDER BY priority DESC, scheduled_at ASC
                LIMIT 10
            `);

            console.log(`📧 Found ${result.rows.length} pending emails`);

            for (const email of result.rows) {
                await this.processQueueItem(email);
            }
        } catch (error) {
            console.error('❌ Error processing email queue:', error);
        }
    }

    /**
     * Process individual queue item
     */
    private static async processQueueItem(email: any): Promise<void> {
        try {
            console.log(`🔄 Processing email ${email.id} to ${email.to_email}`);

            // Update status to sending
            await db.query('UPDATE email_queue SET status = $1 WHERE id = $2', ['sending', email.id]);

            const result = await this.sendEmail({
                to: email.to_email,
                from: email.from_email,
                fromName: email.from_name,
                subject: email.subject,
                text: email.text_content || email.html_content || '',
                html: email.html_content || email.text_content || '',
                cc: email.cc,
                bcc: email.bcc
            });

            if (result.success) {
                // Update status to sent
                await db.query(
                    'UPDATE email_queue SET status = $1, sent_at = NOW() WHERE id = $2',
                    ['sent', email.id]
                );

                // Log email
                await db.query(`
                    INSERT INTO email_logs (queue_id, recipient_email, subject, status, provider_message_id)
                    VALUES ($1, $2, $3, $4, $5)
                `, [email.id, email.to_email, email.subject, 'sent', result.messageId]);

                console.log(`✅ Email sent successfully to ${email.to_email}`);
            } else {
                // Update status to failed
                await db.query(
                    'UPDATE email_queue SET status = $1, error_message = $2 WHERE id = $3',
                    ['failed', result.error, email.id]
                );

                console.log(`❌ Email failed to ${email.to_email}: ${result.error}`);
            }

        } catch (error) {
            console.error(`❌ Error processing email ${email.id}:`, error);
            await db.query(
                'UPDATE email_queue SET status = $1, error_message = $2 WHERE id = $3',
                ['failed', error instanceof Error ? error.message : 'Unknown error', email.id]
            );
        }
    }
}

export default SimpleEmailService;

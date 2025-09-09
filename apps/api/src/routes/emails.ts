import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../utils/validation';
import { authenticate, authorize } from '../middleware/auth';
import { emailService } from '../services/emailService';
import { ApiResponse } from '@interview-me/types';

const router = express.Router();

// ==================== EMAIL TEMPLATES ====================

// Get all email templates
router.get('/templates', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const { category, search = '' } = req.query;
        
        let whereConditions = ['is_active = true'];
        let params: any[] = [];
        let paramCount = 0;

        if (category && category !== 'all') {
            paramCount++;
            whereConditions.push(`category = $${paramCount}`);
            params.push(category);
        }

        if (search) {
            paramCount++;
            whereConditions.push(`(name ILIKE $${paramCount} OR subject ILIKE $${paramCount})`);
            params.push(`%${search}%`);
        }

        const result = await db.query(`
            SELECT id, name, subject, category, is_active, created_at, updated_at
            FROM email_templates
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY created_at DESC
        `, params);

        const response: ApiResponse = {
            success: true,
            data: result.rows
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching email templates:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch email templates' });
    }
});

// Get email template by ID
router.get('/templates/:id', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const templateId = req.params.id;

        const result = await db.query(
            'SELECT * FROM email_templates WHERE id = $1',
            [templateId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching email template:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch email template' });
    }
});

// Create email template
router.post('/templates', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const { name, subject, html_content, text_content, variables, category } = req.body;

        if (!name || !subject || !html_content) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, subject, and HTML content are required' 
            });
        }

        const result = await db.query(`
            INSERT INTO email_templates (name, subject, html_content, text_content, variables, category)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, subject, html_content, text_content, JSON.stringify(variables || []), category || 'general']);

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error creating email template:', error);
        res.status(500).json({ success: false, error: 'Failed to create email template' });
    }
});

// Update email template
router.put('/templates/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const templateId = req.params.id;
        const { name, subject, html_content, text_content, variables, category, is_active } = req.body;

        const result = await db.query(`
            UPDATE email_templates 
            SET name = $1, subject = $2, html_content = $3, text_content = $4, 
                variables = $5, category = $6, is_active = $7, updated_at = NOW()
            WHERE id = $8
            RETURNING *
        `, [name, subject, html_content, text_content, JSON.stringify(variables || []), category, is_active, templateId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        const response: ApiResponse = {
            success: true,
            data: result.rows[0]
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating email template:', error);
        res.status(500).json({ success: false, error: 'Failed to update email template' });
    }
});

// Delete email template
router.delete('/templates/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const templateId = req.params.id;

        await db.query('DELETE FROM email_templates WHERE id = $1', [templateId]);

        const response: ApiResponse = {
            success: true,
            data: { message: 'Template deleted successfully' }
        };

        res.json(response);
    } catch (error) {
        console.error('Error deleting email template:', error);
        res.status(500).json({ success: false, error: 'Failed to delete email template' });
    }
});

// ==================== EMAIL QUEUE ====================

// Get email queue
router.get('/queue', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let whereClause = '';
        let params: any[] = [];
        let paramCount = 0;

        if (status !== 'all') {
            paramCount++;
            whereClause = `WHERE status = $${paramCount}`;
            params.push(status);
        }

        const result = await db.query(`
            SELECT id, to_email, to_name, subject, status, priority, 
                   scheduled_at, sent_at, error_message, retry_count, created_at
            FROM email_queue
            ${whereClause}
            ORDER BY priority DESC, scheduled_at ASC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, [...params, Number(limit), offset]);

        const countResult = await db.query(`
            SELECT COUNT(*) as total
            FROM email_queue
            ${whereClause}
        `, params);

        const response: ApiResponse = {
            success: true,
            data: {
                emails: result.rows,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: Number(countResult.rows[0].total),
                    pages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
                }
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching email queue:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch email queue' });
    }
});

// Process email queue
router.post('/queue/process', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        await emailService.processQueue();

        const response: ApiResponse = {
            success: true,
            data: { message: 'Email queue processed successfully' }
        };

        res.json(response);
    } catch (error) {
        console.error('Error processing email queue:', error);
        res.status(500).json({ success: false, error: 'Failed to process email queue' });
    }
});

// ==================== EMAIL LOGS ====================

// Get email logs
router.get('/logs', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 20, period = '30d' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let whereConditions = [];
        let params: any[] = [];
        let paramCount = 0;

        if (status !== 'all') {
            paramCount++;
            whereConditions.push(`status = $${paramCount}`);
            params.push(status);
        }

        if (period === '7d') {
            whereConditions.push(`created_at > NOW() - INTERVAL '7 days'`);
        } else if (period === '30d') {
            whereConditions.push(`created_at > NOW() - INTERVAL '30 days'`);
        } else if (period === '90d') {
            whereConditions.push(`created_at > NOW() - INTERVAL '90 days'`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const result = await db.query(`
            SELECT id, recipient_email, subject, status, provider, 
                   opened_at, clicked_at, bounced_at, created_at
            FROM email_logs
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, [...params, Number(limit), offset]);

        const countResult = await db.query(`
            SELECT COUNT(*) as total
            FROM email_logs
            ${whereClause}
        `, params);

        const response: ApiResponse = {
            success: true,
            data: {
                logs: result.rows,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: Number(countResult.rows[0].total),
                    pages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
                }
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching email logs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch email logs' });
    }
});

// ==================== EMAIL STATISTICS ====================

// Get email statistics
router.get('/stats', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        const stats = await emailService.getEmailStats(period as string);

        const response: ApiResponse = {
            success: true,
            data: {
                period,
                ...stats,
                generatedAt: new Date().toISOString()
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching email stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch email statistics' });
    }
});

// ==================== EMAIL SENDING ====================

// Send test email
router.post('/send-test', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const { to_email, to_name, template_name, variables = {} } = req.body;

        if (!to_email || !template_name) {
            return res.status(400).json({ 
                success: false, 
                error: 'To email and template name are required' 
            });
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

        res.json(response);
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ success: false, error: 'Failed to send test email' });
    }
});

// Send welcome email to client
router.post('/send-welcome/:clientId', authenticate, authorize(['ADMIN', 'MANAGER', 'WORKER']), async (req, res) => {
    try {
        const clientId = req.params.clientId;

        const success = await emailService.sendWelcomeEmail(clientId);

        if (success) {
            const response: ApiResponse = {
                success: true,
                data: { message: 'Welcome email sent successfully' }
            };
            res.json(response);
        } else {
            res.status(500).json({ success: false, error: 'Failed to send welcome email' });
        }
    } catch (error) {
        console.error('Error sending welcome email:', error);
        res.status(500).json({ success: false, error: 'Failed to send welcome email' });
    }
});

// Send interview scheduled email
router.post('/send-interview-scheduled', authenticate, authorize(['ADMIN', 'MANAGER', 'WORKER']), async (req, res) => {
    try {
        const { clientId, interviewData } = req.body;

        if (!clientId || !interviewData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client ID and interview data are required' 
            });
        }

        const success = await emailService.sendInterviewScheduledEmail(clientId, interviewData);

        if (success) {
            const response: ApiResponse = {
                success: true,
                data: { message: 'Interview scheduled email sent successfully' }
            };
            res.json(response);
        } else {
            res.status(500).json({ success: false, error: 'Failed to send interview scheduled email' });
        }
    } catch (error) {
        console.error('Error sending interview scheduled email:', error);
        res.status(500).json({ success: false, error: 'Failed to send interview scheduled email' });
    }
});

// ==================== APPLICATION EMAILS ====================

// Generate application email
router.post('/generate-application-email', authenticate, authorize(['ADMIN', 'MANAGER', 'WORKER']), async (req, res) => {
    try {
        const { clientId, companyName, jobTitle } = req.body;

        if (!clientId || !companyName || !jobTitle) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client ID, company name, and job title are required' 
            });
        }

        const proxyEmail = await emailService.generateApplicationEmail(clientId, companyName, jobTitle);

        const response: ApiResponse = {
            success: true,
            data: { proxyEmail }
        };

        res.json(response);
    } catch (error) {
        console.error('Error generating application email:', error);
        res.status(500).json({ success: false, error: 'Failed to generate application email' });
    }
});

// Get application emails
router.get('/application-emails', authenticate, authorize(['ADMIN', 'MANAGER', 'WORKER']), async (req, res) => {
    try {
        const { clientId, status = 'all', page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let whereConditions = [];
        let params: any[] = [];
        let paramCount = 0;

        if (clientId) {
            paramCount++;
            whereConditions.push(`client_id = $${paramCount}`);
            params.push(clientId);
        }

        if (status !== 'all') {
            paramCount++;
            whereConditions.push(`status = $${paramCount}`);
            params.push(status);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const result = await db.query(`
            SELECT id, client_id, proxy_email, company_email, job_title, 
                   company_name, domain_type, status, last_email_received, 
                   email_count, created_at
            FROM application_emails
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, [...params, Number(limit), offset]);

        const countResult = await db.query(`
            SELECT COUNT(*) as total
            FROM application_emails
            ${whereClause}
        `, params);

        const response: ApiResponse = {
            success: true,
            data: {
                applicationEmails: result.rows,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: Number(countResult.rows[0].total),
                    pages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
                }
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching application emails:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch application emails' });
    }
});

export default router;

// Frontend email service - works within Next.js environment
import { db } from '../utils/database';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import path from 'path';
import { clientDomainService } from './ClientDomainService';

// Load environment variables from parent directory
dotenv.config({ path: path.join(process.cwd(), '../../.env') });

// Configure SendGrid
console.log('SendGrid API Key loaded:', process.env.SENDGRID_API_KEY ? 'Yes' : 'No');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid configured successfully');
} else {
  console.error('SendGrid API key not found in environment variables');
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

export interface EmailQueueItem {
  id: string;
  to_email: string;
  to_name?: string;
  from_email: string;
  from_name: string;
  template_id?: string;
  subject: string;
  html_content?: string;
  text_content?: string;
  variables?: Record<string, any>;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'bounced' | 'delivered';
  priority: number;
  scheduled_at: Date;
  sent_at?: Date;
  delivered_at?: Date;
  error_message?: string;
  retry_count: number;
  max_retries: number;
}

export class EmailService {
  // Generate application email based on client and company
  async generateApplicationEmail(clientId: string, companyName: string, jobTitle: string): Promise<string> {
    try {
      // Get client details
      const clientResult = await db.query(
        'SELECT name, email FROM clients WHERE id = $1',
        [clientId]
      );

      if (clientResult.rows.length === 0) {
        throw new Error('Client not found');
      }

      const client = clientResult.rows[0];

      // Determine domain type based on company
      const domainType = this.getDomainType(companyName);
      const domain = this.getDomain(domainType);

      // Generate sanitized name for email
      const sanitizedName = client.name.toLowerCase()
        .replace(/[^a-z0-9]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '');

      // Generate unique identifier
      const timestamp = Date.now().toString(36);
      const randomId = Math.random().toString(36).substring(2, 8);

      const proxyEmail = `${sanitizedName}.${timestamp}.${randomId}@${domain}`;

      // Store application email record
      await db.query(`
        INSERT INTO application_emails (
          client_id, proxy_email, company_email, job_title, company_name, domain_type
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (proxy_email) DO UPDATE SET
          company_email = EXCLUDED.company_email,
          job_title = EXCLUDED.job_title,
          company_name = EXCLUDED.company_name,
          updated_at = CURRENT_TIMESTAMP
      `, [clientId, proxyEmail, '', jobTitle, companyName, domainType]);

      return proxyEmail;
    } catch (error) {
      console.error('Error generating application email:', error);
      throw error;
    }
  }

  // Determine domain type based on company
  private getDomainType(companyName: string): string {
    const company = companyName.toLowerCase();

    // Tech companies
    if (company.includes('tech') || company.includes('software') || company.includes('ai') ||
      company.includes('data') || company.includes('cloud') || company.includes('digital')) {
      return 'tech';
    }

    // Finance companies
    if (company.includes('bank') || company.includes('finance') || company.includes('investment') ||
      company.includes('credit') || company.includes('insurance') || company.includes('trading')) {
      return 'finance';
    }

    // Default to careers
    return 'careers';
  }

  // Get domain for type
  private getDomain(domainType: string): string {
    const domains = {
      careers: 'careers.interviewsfirst-dev.com',
      applications: 'applications.interviewsfirst-dev.com',
      tech: 'tech-careers.interviewsfirst-dev.com',
      finance: 'finance-careers.interviewsfirst-dev.com',
      support: 'support.interviewsfirst-dev.com'
    };

    return domains[domainType as keyof typeof domains] || domains.careers;
  }

  // Get email template by name (backward compatibility)
  async getTemplate(templateName: string): Promise<EmailTemplate | null> {
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

  // Get default template by category
  async getDefaultTemplate(category: string): Promise<EmailTemplate | null> {
    try {
      const result = await db.query(
        'SELECT * FROM email_templates WHERE category = $1 AND is_default = true AND is_active = true',
        [category]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting default template:', error);
      return null;
    }
  }

  // Get any active template by category (fallback)
  async getAnyTemplate(category: string): Promise<EmailTemplate | null> {
    try {
      const result = await db.query(
        'SELECT * FROM email_templates WHERE category = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
        [category]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting any template:', error);
      return null;
    }
  }

  // Get best available template by category (default first, then any active)
  async getBestTemplate(category: string): Promise<EmailTemplate | null> {
    try {
      // First try to get the default template
      let template = await this.getDefaultTemplate(category);

      // If no default template, get any active template in the category
      if (!template) {
        template = await this.getAnyTemplate(category);
      }

      return template;
    } catch (error) {
      console.error('Error getting best template:', error);
      return null;
    }
  }

  // Render template with variables
  renderTemplate(template: EmailTemplate, variables: Record<string, any>): { subject: string; html: string; text: string } {
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

  // Queue email for sending
  async queueEmail(
    toEmail: string,
    toName: string,
    templateName: string,
    variables: Record<string, any>,
    priority: number = 0,
    scheduledAt?: Date
  ): Promise<string> {
    try {
      const template = await this.getTemplate(templateName);
      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }

      const rendered = this.renderTemplate(template, variables);

      const result = await db.query(`
        INSERT INTO email_queue (
          to_email, to_name, from_email, from_name, template_id, subject,
          html_content, text_content, variables, priority, scheduled_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        toEmail,
        toName,
        process.env.VERIFIED_SENDER_EMAIL || 'interviewsfirst@gmail.com',
        'InterviewsFirst',
        template.id,
        rendered.subject,
        rendered.html,
        rendered.text,
        JSON.stringify(variables),
        priority,
        scheduledAt || new Date()
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Error queuing email:', error);
      throw error;
    }
  }

  // Queue direct email (for compose functionality)
  async queueDirectEmail(emailData: {
    to_email: string;
    to_name: string;
    from_email: string;
    from_name: string;
    subject: string;
    html_content: string;
    text_content: string;
    cc?: string;
    bcc?: string;
    attachments?: any[];
    client_id?: string;
  }): Promise<string> {
    try {
      // Get client-specific sender email if client_id is provided
      let senderEmail = emailData.from_email;
      console.log(`Original sender email: ${senderEmail}, Client ID: ${emailData.client_id}`);

      if (emailData.client_id) {
        try {
          console.log(`Attempting to get client-specific sender email for client: ${emailData.client_id}`);
          const clientSenderEmail = await clientDomainService.getSenderEmail(emailData.client_id);
          console.log(`Client sender email retrieved: ${clientSenderEmail}`);
          senderEmail = clientSenderEmail;
          console.log(`Using client-specific sender email: ${senderEmail} for client ${emailData.client_id}`);
        } catch (error) {
          console.error('Error getting client sender email, using provided email:', error);
        }
      } else {
        console.log('No client_id provided, using original sender email');
      }

      const result = await db.query(`
        INSERT INTO email_queue (
          to_email, to_name, from_email, from_name, subject,
          html_content, text_content, cc, bcc, attachments, priority, scheduled_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), 'pending')
        RETURNING id
      `, [
        emailData.to_email,
        emailData.to_name,
        senderEmail, // Use client-specific sender email
        emailData.from_name,
        emailData.subject,
        emailData.html_content,
        emailData.text_content,
        emailData.cc || '',
        emailData.bcc || '',
        JSON.stringify(emailData.attachments || []),
        0 // Normal priority
      ]);

      // Create client-email relationship if client_id is provided
      if (emailData.client_id) {
        await db.query(`
          INSERT INTO client_email_relationships (client_id, email_queue_id, relationship_type)
          VALUES ($1, $2, 'sent')
        `, [emailData.client_id, result.rows[0].id]);
      }

      // Process the email queue immediately
      try {
        await this.processQueue();
      } catch (error) {
        console.error('Error processing email queue:', error);
        // Don't fail the request if queue processing fails
      }

      return result.rows[0].id;
    } catch (error) {
      console.error('Error queuing direct email:', error);
      throw error;
    }
  }

  // Queue email by category (new method)
  async queueEmailByCategory(
    toEmail: string,
    toName: string,
    category: string,
    variables: Record<string, any>,
    priority: number = 0,
    scheduledAt?: Date
  ): Promise<string> {
    try {
      const template = await this.getBestTemplate(category);
      if (!template) {
        throw new Error(`No template found for category: ${category}`);
      }

      const rendered = this.renderTemplate(template, variables);

      const result = await db.query(`
        INSERT INTO email_queue (
          to_email, to_name, from_email, from_name, template_id, subject,
          html_content, text_content, variables, priority, scheduled_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        toEmail,
        toName,
        process.env.VERIFIED_SENDER_EMAIL || 'interviewsfirst@gmail.com',
        'InterviewsFirst',
        template.id,
        rendered.subject,
        rendered.html,
        rendered.text,
        JSON.stringify(variables),
        priority,
        scheduledAt || new Date()
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Error queuing email by category:', error);
      throw error;
    }
  }

  // Send welcome email to client
  async sendWelcomeEmail(clientId: string): Promise<boolean> {
    try {
      // Get client and worker details
      const result = await db.query(`
        SELECT 
          c.name as client_name,
          c.email as client_email,
          u.name as worker_name,
          u.email as worker_email
        FROM clients c
        LEFT JOIN users u ON c.worker_id = u.id
        WHERE c.id = $1
      `, [clientId]);

      if (result.rows.length === 0) {
        throw new Error('Client not found');
      }

      const { client_name, client_email, worker_name, worker_email } = result.rows[0];

      // Queue welcome email using category-based selection
      await this.queueEmailByCategory(
        client_email,
        client_name,
        'welcome', // Use category instead of hardcoded template name
        {
          clientName: client_name,
          workerName: worker_name || 'Your Career Coach',
          workerEmail: worker_email || 'support@interviewsfirst.com',
          workerPhone: 'Contact us for details',
          clientEmail: client_email,
          dashboardUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'}/dashboard`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'}/unsubscribe?token=${clientId}`
        },
        10 // High priority
      );

      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  // Send interview scheduled email
  async sendInterviewScheduledEmail(
    clientId: string,
    interviewData: {
      companyName: string;
      jobTitle: string;
      interviewDate: string;
      interviewTime: string;
      interviewType: string;
      interviewLocation: string;
      interviewUrl: string;
    }
  ): Promise<boolean> {
    try {
      // Get client and worker details
      const result = await db.query(`
        SELECT 
          c.name as client_name,
          c.email as client_email,
          u.name as worker_name,
          u.email as worker_email
        FROM clients c
        LEFT JOIN users u ON c.worker_id = u.id
        WHERE c.id = $1
      `, [clientId]);

      if (result.rows.length === 0) {
        throw new Error('Client not found');
      }

      const { client_name, client_email, worker_name, worker_email } = result.rows[0];

      // Queue interview scheduled email using category-based selection
      await this.queueEmailByCategory(
        client_email,
        client_name,
        'interview', // Use category instead of hardcoded template name
        {
          clientName: client_name,
          companyName: interviewData.companyName,
          jobTitle: interviewData.jobTitle,
          interviewDate: interviewData.interviewDate,
          interviewTime: interviewData.interviewTime,
          interviewType: interviewData.interviewType,
          interviewLocation: interviewData.interviewLocation,
          interviewUrl: interviewData.interviewUrl,
          workerName: worker_name || 'Your Career Coach',
          workerEmail: worker_email || 'support@interviewsfirst.com',
          clientEmail: client_email,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'}/unsubscribe?token=${clientId}`
        },
        10 // High priority
      );

      return true;
    } catch (error) {
      console.error('Error sending interview scheduled email:', error);
      return false;
    }
  }

  // Get email statistics
  async getEmailStats(period: string = '30d'): Promise<any> {
    try {
      let dateFilter = '';
      if (period === '7d') {
        dateFilter = "AND created_at > NOW() - INTERVAL '7 days'";
      } else if (period === '30d') {
        dateFilter = "AND created_at > NOW() - INTERVAL '30 days'";
      } else if (period === '90d') {
        dateFilter = "AND created_at > NOW() - INTERVAL '90 days'";
      }

      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_emails,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_emails,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_emails,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_emails,
          COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced_emails,
          COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened_emails,
          COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked_emails
        FROM email_logs
        WHERE 1=1 ${dateFilter}
      `);

      return stats.rows[0];
    } catch (error) {
      console.error('Error getting email stats:', error);
      return null;
    }
  }

  // Process email queue
  async processQueue(): Promise<void> {
    try {
      console.log('Processing email queue...');

      // Get pending emails ordered by priority and scheduled time
      const result = await db.query(`
        SELECT * FROM email_queue 
        WHERE status = 'pending' 
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT 10
      `);

      console.log(`Found ${result.rows.length} pending emails`);

      for (const email of result.rows) {
        await this.processEmailQueueItem(email);
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    }
  }

  // Process individual email queue item
  private async processEmailQueueItem(email: EmailQueueItem): Promise<void> {
    try {
      console.log(`Processing email to ${email.to_email}`);

      // Update status to sending
      await db.query(
        'UPDATE email_queue SET status = $1 WHERE id = $2',
        ['sending', email.id]
      );

      // Send email via SendGrid
      const msg = {
        to: email.to_email,
        from: {
          email: email.from_email,
          name: email.from_name
        },
        subject: email.subject,
        text: email.text_content || '',
        html: email.html_content || email.text_content || ''
      };

      await sgMail.send(msg);
      console.log(`✅ Email sent successfully to ${email.to_email}`);

      // Update status to sent
      await db.query(
        'UPDATE email_queue SET status = $1, sent_at = NOW() WHERE id = $2',
        ['sent', email.id]
      );

      // Log email
      await this.logEmail(email.id, email.to_email, email.subject, 'sent');

    } catch (error) {
      console.error(`❌ Failed to send email to ${email.to_email}:`, error);

      // Update status to failed
      await db.query(
        'UPDATE email_queue SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', (error as Error).message, email.id]
      );

      await this.logEmail(email.id, email.to_email, email.subject, 'failed', (error as Error).message);
    }
  }

  // Log email
  private async logEmail(
    queueId: string,
    recipientEmail: string,
    subject: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.query(`
        INSERT INTO email_logs (queue_id, recipient_email, subject, status, error_message)
        VALUES ($1, $2, $3, $4, $5)
      `, [queueId, recipientEmail, subject, status, errorMessage]);
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
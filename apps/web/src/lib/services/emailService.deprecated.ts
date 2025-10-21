/**
 * @deprecated This service has been replaced by SimpleEmailService
 * Use SimpleEmailService for all new email functionality
 * This file is kept for reference and will be removed in a future version
 */

// Frontend email service - works within Next.js environment
import { db } from '../utils/database';
import sgMail from '@sendgrid/mail';
import { clientDomainService } from './ClientDomainService';

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
  attachments?: any[] | string; // Can be array or JSON string from DB
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
      // Prepare subject/html/text using template when available; otherwise allow fallback
      let subject: string;
      let html: string;
      let text: string;

      if (!template) {
        // Fallback for AI Apply flow when the DB template isn't present.
        if (templateName === 'ai_application') {
          subject = variables.emailSubject || `Application for ${variables.jobTitle || ''} at ${variables.companyName || ''}`.trim();
          const body = variables.emailBody || '';
          html = typeof body === 'string' ? body.replace(/\n/g, '<br>') : String(body);
          text = typeof body === 'string' ? body : String(body);
        } else {
          throw new Error(`Template ${templateName} not found`);
        }
      } else {
        const rendered = this.renderTemplate(template, variables);
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text;
      }

      const result = await db.query(`
        INSERT INTO email_queue (
          to_email, to_name, from_email, from_name, template_id, subject,
          html_content, text_content, variables, priority, scheduled_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        toEmail,
        toName,
        process.env.VERIFIED_SENDER_EMAIL || 'applications@interviewsfirst.com',
        'InterviewsFirst',
        template ? template.id : null,
        subject,
        html,
        text,
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
      // Use a single verified sender email for all outbound emails
      const verifiedSenderEmail = process.env.VERIFIED_SENDER_EMAIL || 'applications@interviewsfirst.com';
      console.log(`Using verified sender email: ${verifiedSenderEmail} for client: ${emailData.client_id}`);

      // Generate client-specific reply-to address for inbound routing
      let replyToEmail = verifiedSenderEmail;
      if (emailData.client_id) {
        try {
          // Get client info to generate reply-to address
          const clientResult = await db.query('SELECT name FROM clients WHERE id = $1', [emailData.client_id]);
          if (clientResult.rows.length > 0) {
            const clientName = clientResult.rows[0].name;
            const sanitizedName = clientName.toLowerCase()
              .replace(/[^a-z0-9]/g, '.')
              .replace(/\.+/g, '.')
              .replace(/^\.|\.$/g, '');
            replyToEmail = `client+${emailData.client_id}@interviewsfirst.com`;
            console.log(`Generated reply-to address: ${replyToEmail} for client: ${clientName}`);
          }
        } catch (error) {
          console.error('Error generating reply-to address:', error);
          // Fall back to verified sender if client lookup fails
        }
      }

      // Check if the email_queue table has the required columns
      const tableCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'email_queue' 
        AND column_name IN ('cc', 'bcc', 'attachments')
      `);

      const hasCC = tableCheck.rows.some((row: any) => row.column_name === 'cc');
      const hasBCC = tableCheck.rows.some((row: any) => row.column_name === 'bcc');
      const hasAttachments = tableCheck.rows.some((row: any) => row.column_name === 'attachments');

      console.log(`Email queue table columns: cc=${hasCC}, bcc=${hasBCC}, attachments=${hasAttachments}`);

      let query: string;
      let values: any[];

      if (hasCC && hasBCC && hasAttachments) {
        // Full schema with all columns
        query = `
          INSERT INTO email_queue (
            to_email, to_name, from_email, from_name, subject,
            html_content, text_content, cc, bcc, attachments, priority, scheduled_at, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
          RETURNING id
        `;
        values = [
          emailData.to_email,
          emailData.to_name,
          verifiedSenderEmail, // Use verified sender for FROM
          emailData.from_name,
          emailData.subject,
          emailData.html_content,
          emailData.text_content,
          emailData.cc || '',
          emailData.bcc || '',
          JSON.stringify(emailData.attachments || []),
          0, // Normal priority
          new Date() // scheduled_at - send immediately
        ];
      } else {
        // Fallback to basic schema without cc, bcc, attachments
        console.warn('Email queue table missing cc/bcc/attachments columns, using basic schema');
        query = `
          INSERT INTO email_queue (
            to_email, to_name, from_email, from_name, subject,
            html_content, text_content, priority, scheduled_at, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
          RETURNING id
        `;
        values = [
          emailData.to_email,
          emailData.to_name,
          verifiedSenderEmail, // Use verified sender for FROM
          emailData.from_name,
          emailData.subject,
          emailData.html_content,
          emailData.text_content,
          0, // Normal priority
          new Date() // scheduled_at - send immediately
        ];
      }

      const result = await db.query(query, values);

      // Create client-email relationship if client_id is provided and table exists
      if (emailData.client_id) {
        try {
          await db.query(`
            INSERT INTO client_email_relationships (client_id, email_queue_id, relationship_type)
            VALUES ($1, $2, 'sent')
          `, [emailData.client_id, result.rows[0].id]);
        } catch (error) {
          console.warn('Could not create client-email relationship (table may not exist):', error);
        }
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
        process.env.VERIFIED_SENDER_EMAIL || 'applications@interviewsfirst.com',
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
      console.log('🔄 Processing email queue...');

      // Get pending emails ordered by priority and scheduled time
      const result = await db.query(`
        SELECT * FROM email_queue 
        WHERE status = 'pending' 
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT 10
      `);

      console.log(`📧 Found ${result.rows.length} pending emails`);

      for (const email of result.rows) {
        console.log(`🔄 Processing email ${email.id} to ${email.to_email}`);
        await this.processEmailQueueItem(email);
      }
    } catch (error) {
      console.error('❌ Error processing email queue:', error);
    }
  }

  // Process individual email queue item
  private async processEmailQueueItem(email: EmailQueueItem): Promise<void> {
    try {
      console.log(`🔄 Processing email to ${email.to_email}`);

      // Update status to sending
      await db.query(
        'UPDATE email_queue SET status = $1 WHERE id = $2',
        ['sending', email.id]
      );

      // Parse and fetch attachments if they exist
      let attachments = [];
      if (email.attachments) {
        try {
          const parsedAttachments = typeof email.attachments === 'string'
            ? JSON.parse(email.attachments)
            : email.attachments;

          if (Array.isArray(parsedAttachments)) {
            for (const att of parsedAttachments) {
              if (att.url) {
                try {
                  // Fetch the attachment content from the URL
                  const response = await fetch(att.url);
                  if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const base64Content = Buffer.from(buffer).toString('base64');

                    attachments.push({
                      content: base64Content,
                      filename: att.name,
                      type: att.type || 'application/pdf',
                      disposition: 'attachment'
                    });
                  } else {
                    console.error(`Failed to fetch attachment from ${att.url}: ${response.status}`);
                  }
                } catch (fetchError) {
                  console.error(`Error fetching attachment ${att.name}:`, fetchError);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error parsing attachments:', error);
        }
      }

      // Check if SendGrid is properly configured
      console.log('🔧 Checking SendGrid configuration...');
      console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
      if (!process.env.SENDGRID_API_KEY) {
        console.error('❌ SendGrid API key not configured');
        throw new Error('SendGrid API key not configured');
      }
      console.log('✅ SendGrid API key found');

      // Send email via SendGrid with reply-to pattern
      const msg: any = {
        to: email.to_email,
        from: {
          email: email.from_email,
          name: email.from_name
        },
        subject: email.subject,
        text: email.text_content || email.html_content || '',
        html: email.html_content || email.text_content || ''
      };

      // Add reply-to header for client-specific routing
      if (email.variables) {
        try {
          const variables = typeof email.variables === 'string'
            ? JSON.parse(email.variables)
            : email.variables;

          if (variables.client_id) {
            msg.replyTo = `client+${variables.client_id}@interviewsfirst.com`;
            console.log(`Added reply-to: ${msg.replyTo} for client: ${variables.client_id}`);
          }
        } catch (error) {
          console.error('Error parsing email variables for reply-to:', error);
        }
      }

      // Only add attachments if they exist
      if (attachments.length > 0) {
        msg.attachments = attachments;
      }

      // Add CC and BCC if they exist in the email object
      if ((email as any).cc && (email as any).cc.trim()) {
        msg.cc = (email as any).cc.split(',').map((email: string) => email.trim());
      }
      if ((email as any).bcc && (email as any).bcc.trim()) {
        msg.bcc = (email as any).bcc.split(',').map((email: string) => email.trim());
      }

      console.log(`📤 Sending email via SendGrid to ${email.to_email}`, {
        subject: email.subject,
        from: email.from_email,
        hasAttachments: attachments.length > 0,
        hasCC: !!(email as any).cc,
        hasBCC: !!(email as any).bcc
      });

      console.log('📧 SendGrid message object:', JSON.stringify(msg, null, 2));

      const response = await sgMail.send(msg);
      console.log(`✅ Email sent successfully to ${email.to_email}`, {
        statusCode: response[0].statusCode,
        messageId: response[0].headers['x-message-id']
      });

      // Update status to sent
      await db.query(
        'UPDATE email_queue SET status = $1, sent_at = NOW() WHERE id = $2',
        ['sent', email.id]
      );

      // Log email
      await this.logEmail(email.id, email.to_email, email.subject, 'sent');

    } catch (error) {
      console.error(`❌ Failed to send email to ${email.to_email}:`, error);
      console.error('Error details:', error);

      // Log SendGrid specific error details
      if ((error as any).response) {
        console.error('SendGrid response status:', (error as any).response.status);
        console.error('SendGrid response body:', (error as any).response.body);
      }

      // Update status to failed with retry logic
      const errorMessage = (error as Error).message;
      const currentRetryCount = (email as any).retry_count || 0;
      const maxRetries = (email as any).max_retries || 3;

      if (currentRetryCount < maxRetries) {
        // Retry the email
        const nextRetryTime = new Date(Date.now() + Math.pow(2, currentRetryCount) * 60000); // Exponential backoff
        await db.query(
          'UPDATE email_queue SET status = $1, error_message = $2, retry_count = $3, scheduled_at = $4 WHERE id = $5',
          ['pending', errorMessage, currentRetryCount + 1, nextRetryTime, email.id]
        );
        console.log(`📧 Email queued for retry ${currentRetryCount + 1}/${maxRetries} at ${nextRetryTime.toISOString()}`);
      } else {
        // Max retries reached, mark as failed
        await db.query(
          'UPDATE email_queue SET status = $1, error_message = $2 WHERE id = $3',
          ['failed', errorMessage, email.id]
        );
        console.log(`❌ Email failed permanently after ${maxRetries} retries`);
      }

      await this.logEmail(email.id, email.to_email, email.subject, 'failed', errorMessage);
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
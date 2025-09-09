import nodemailer from 'nodemailer';
import { db } from '../utils/database';

// Email configuration
const EMAIL_CONFIG = {
  // Development domains (easily replaceable)
  domains: {
    careers: 'careers.interviewsfirst-dev.com',
    applications: 'applications.interviewsfirst-dev.com',
    tech: 'tech-careers.interviewsfirst-dev.com',
    finance: 'finance-careers.interviewsfirst-dev.com',
    support: 'support.interviewsfirst-dev.com'
  },
  
  // Production domains (for later)
  productionDomains: {
    careers: 'careers.interviewsfirst.com',
    applications: 'applications.interviewsfirst.com',
    tech: 'tech-careers.interviewsfirst.com',
    finance: 'finance-careers.interviewsfirst.com',
    support: 'support.interviewsfirst.com'
  },
  
  // Email provider configuration
  provider: process.env.EMAIL_PROVIDER || 'nodemailer',
  nodemailer: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  }
};

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
  private transporter: nodemailer.Transporter | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      if (EMAIL_CONFIG.provider === 'nodemailer') {
        this.transporter = nodemailer.createTransporter(EMAIL_CONFIG.nodemailer);
        await this.transporter.verify();
        console.log('✅ Email transporter initialized successfully');
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      this.isInitialized = false;
    }
  }

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
      const domain = EMAIL_CONFIG.domains[domainType as keyof typeof EMAIL_CONFIG.domains];
      
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

  // Get email template by name
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
        EMAIL_CONFIG.domains.support,
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

  // Send email immediately
  async sendEmail(
    toEmail: string,
    toName: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    fromEmail?: string,
    fromName?: string
  ): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: `${fromName || 'InterviewsFirst'} <${fromEmail || EMAIL_CONFIG.domains.support}>`,
        to: `${toName} <${toEmail}>`,
        subject,
        html: htmlContent,
        text: textContent
      };

      if (this.transporter) {
        await this.transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${toEmail}`);
        return true;
      } else {
        throw new Error('No email transporter available');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
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
          u.email as worker_email,
          u.phone as worker_phone
        FROM clients c
        LEFT JOIN users u ON c.worker_id = u.id
        WHERE c.id = $1
      `, [clientId]);

      if (result.rows.length === 0) {
        throw new Error('Client not found');
      }

      const { client_name, client_email, worker_name, worker_email, worker_phone } = result.rows[0];

      // Queue welcome email
      await this.queueEmail(
        client_email,
        client_name,
        'client_welcome',
        {
          clientName: client_name,
          workerName: worker_name || 'Your Career Coach',
          workerEmail: worker_email || 'support@interviewsfirst.com',
          workerPhone: worker_phone || 'Contact us for details',
          clientEmail: client_email,
          dashboardUrl: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/unsubscribe?token=${clientId}`
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

      // Queue interview scheduled email
      await this.queueEmail(
        client_email,
        client_name,
        'interview_scheduled',
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
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/unsubscribe?token=${clientId}`
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
}

// Export singleton instance
export const emailService = new EmailService();

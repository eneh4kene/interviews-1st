-- Email Notification System Database Schema
-- This script adds email-related tables to the existing database

-- Email templates table
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB, -- Available template variables
    category VARCHAR(50) DEFAULT 'general', -- 'welcome', 'interview', 'notification', 'marketing'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email queue table for reliable delivery
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    template_id UUID REFERENCES email_templates(id),
    subject VARCHAR(255) NOT NULL,
    html_content TEXT,
    text_content TEXT,
    variables JSONB, -- Template variables
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'bounced', 'delivered')),
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email logs table for tracking and analytics
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES email_queue(id),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    provider VARCHAR(50), -- 'sendgrid', 'ses', 'nodemailer'
    provider_message_id VARCHAR(255),
    provider_response JSONB,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    complaint_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application emails table for job application tracking
CREATE TABLE application_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    application_id UUID REFERENCES applications(id),
    proxy_email VARCHAR(255) UNIQUE NOT NULL,
    company_email VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    domain_type VARCHAR(50) DEFAULT 'careers', -- 'careers', 'tech-careers', 'finance-careers'
    status VARCHAR(50) DEFAULT 'active',
    last_email_received TIMESTAMP,
    email_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email responses table for parsing company responses
CREATE TABLE email_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_email_id UUID REFERENCES application_emails(id),
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    html_body TEXT,
    response_type VARCHAR(50), -- 'interview_invitation', 'rejection', 'follow_up', 'scheduling'
    parsed_data JSONB,
    forwarded_to_client BOOLEAN DEFAULT false,
    requires_action BOOLEAN DEFAULT false,
    action_taken BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email preferences table for users
CREATE TABLE email_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    user_type VARCHAR(20) NOT NULL, -- 'client', 'worker', 'admin'
    preferences JSONB NOT NULL DEFAULT '{}',
    is_subscribed BOOLEAN DEFAULT true,
    unsubscribe_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email domains configuration table
CREATE TABLE email_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_name VARCHAR(255) UNIQUE NOT NULL,
    domain_type VARCHAR(50) NOT NULL, -- 'careers', 'tech-careers', 'finance-careers', 'support'
    is_development BOOLEAN DEFAULT true,
    is_production BOOLEAN DEFAULT false,
    provider VARCHAR(50) DEFAULT 'sendgrid', -- 'sendgrid', 'ses', 'nodemailer'
    provider_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled_at ON email_queue(scheduled_at);
CREATE INDEX idx_email_queue_priority ON email_queue(priority);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_application_emails_client_id ON application_emails(client_id);
CREATE INDEX idx_application_emails_proxy_email ON application_emails(proxy_email);
CREATE INDEX idx_email_responses_application_email_id ON email_responses(application_email_id);
CREATE INDEX idx_email_responses_response_type ON email_responses(response_type);
CREATE INDEX idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX idx_email_domains_domain_type ON email_domains(domain_type);

-- Insert default email domains (development)
INSERT INTO email_domains (domain_name, domain_type, is_development, is_production) VALUES
('careers.interviewsfirst-dev.com', 'careers', true, false),
('applications.interviewsfirst-dev.com', 'applications', true, false),
('tech-careers.interviewsfirst-dev.com', 'tech-careers', true, false),
('finance-careers.interviewsfirst-dev.com', 'finance-careers', true, false),
('support.interviewsfirst-dev.com', 'support', true, false);

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, variables, category) VALUES
('client_welcome', 'Welcome to InterviewsFirst - Your Career Journey Starts Here!', 
'<!DOCTYPE html>
<html>
<head>
    <title>Welcome to InterviewsFirst</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8fafc; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to InterviewsFirst!</h1>
        </div>
        <div class="content">
            <h2>Hello {{clientName}}!</h2>
            <p>Thank you for joining InterviewsFirst. We''re excited to help you advance your career!</p>
            
            <p>Your dedicated career coach <strong>{{workerName}}</strong> will be in touch with you within 24 hours to discuss your career goals and next steps.</p>
            
            <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3>Your Career Coach Details:</h3>
                <p><strong>Name:</strong> {{workerName}}</p>
                <p><strong>Email:</strong> {{workerEmail}}</p>
                <p><strong>Phone:</strong> {{workerPhone}}</p>
            </div>
            
            <p>In the meantime, you can:</p>
            <ul>
                <li>Complete your profile in your dashboard</li>
                <li>Upload your resume and portfolio</li>
                <li>Set your job preferences</li>
                <li>Explore our job listings</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboardUrl}}" class="button">Access Your Dashboard</a>
            </div>
            
            <p>If you have any questions, don''t hesitate to reach out to us at <a href="mailto:support@interviewsfirst.com">support@interviewsfirst.com</a>.</p>
            
            <p>Best regards,<br>The InterviewsFirst Team</p>
        </div>
        <div class="footer">
            <p>This email was sent to {{clientEmail}}. If you no longer wish to receive these emails, you can <a href="{{unsubscribeUrl}}">unsubscribe here</a>.</p>
        </div>
    </div>
</body>
</html>',
'Welcome to InterviewsFirst!

Hello {{clientName}}!

Thank you for joining InterviewsFirst. We''re excited to help you advance your career!

Your dedicated career coach {{workerName}} will be in touch with you within 24 hours to discuss your career goals and next steps.

Your Career Coach Details:
Name: {{workerName}}
Email: {{workerEmail}}
Phone: {{workerPhone}}

In the meantime, you can:
- Complete your profile in your dashboard
- Upload your resume and portfolio
- Set your job preferences
- Explore our job listings

Access your dashboard: {{dashboardUrl}}

If you have any questions, don''t hesitate to reach out to us at support@interviewsfirst.com.

Best regards,
The InterviewsFirst Team

This email was sent to {{clientEmail}}. If you no longer wish to receive these emails, you can unsubscribe here: {{unsubscribeUrl}}',
'["clientName", "workerName", "workerEmail", "workerPhone", "clientEmail", "dashboardUrl", "unsubscribeUrl"]',
'welcome'),

('interview_scheduled', 'Interview Scheduled - {{companyName}} - {{jobTitle}}',
'<!DOCTYPE html>
<html>
<head>
    <title>Interview Scheduled</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8fafc; }
        .interview-details { background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .button { background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Interview Scheduled!</h1>
        </div>
        <div class="content">
            <h2>Great news, {{clientName}}!</h2>
            <p>Your interview with <strong>{{companyName}}</strong> has been successfully scheduled!</p>
            
            <div class="interview-details">
                <h3>Interview Details:</h3>
                <p><strong>Company:</strong> {{companyName}}</p>
                <p><strong>Position:</strong> {{jobTitle}}</p>
                <p><strong>Date:</strong> {{interviewDate}}</p>
                <p><strong>Time:</strong> {{interviewTime}}</p>
                <p><strong>Type:</strong> {{interviewType}}</p>
                <p><strong>Location/Link:</strong> {{interviewLocation}}</p>
            </div>
            
            <p>Please make sure to:</p>
            <ul>
                <li>Review the job description and company information</li>
                <li>Prepare questions to ask the interviewer</li>
                <li>Test your technology setup (for virtual interviews)</li>
                <li>Dress professionally</li>
                <li>Arrive 5-10 minutes early</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{interviewUrl}}" class="button">View Interview Details</a>
            </div>
            
            <p>If you have any questions or need to reschedule, please contact your career coach <strong>{{workerName}}</strong> at {{workerEmail}}.</p>
            
            <p>Good luck with your interview!</p>
            <p>Best regards,<br>The InterviewsFirst Team</p>
        </div>
        <div class="footer">
            <p>This email was sent to {{clientEmail}}. If you no longer wish to receive these emails, you can <a href="{{unsubscribeUrl}}">unsubscribe here</a>.</p>
        </div>
    </div>
</body>
</html>',
'Interview Scheduled - {{companyName}} - {{jobTitle}}

Great news, {{clientName}}!

Your interview with {{companyName}} has been successfully scheduled!

Interview Details:
Company: {{companyName}}
Position: {{jobTitle}}
Date: {{interviewDate}}
Time: {{interviewTime}}
Type: {{interviewType}}
Location/Link: {{interviewLocation}}

Please make sure to:
- Review the job description and company information
- Prepare questions to ask the interviewer
- Test your technology setup (for virtual interviews)
- Dress professionally
- Arrive 5-10 minutes early

View interview details: {{interviewUrl}}

If you have any questions or need to reschedule, please contact your career coach {{workerName}} at {{workerEmail}}.

Good luck with your interview!

Best regards,
The InterviewsFirst Team

This email was sent to {{clientEmail}}. If you no longer wish to receive these emails, you can unsubscribe here: {{unsubscribeUrl}}',
'["clientName", "companyName", "jobTitle", "interviewDate", "interviewTime", "interviewType", "interviewLocation", "interviewUrl", "workerName", "workerEmail", "clientEmail", "unsubscribeUrl"]',
'interview'),

('job_response', 'Response from {{companyName}} - {{jobTitle}}',
'<!DOCTYPE html>
<html>
<head>
    <title>Job Response</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8fafc; }
        .response-details { background: #f3e8ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .button { background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Response from {{companyName}}</h1>
        </div>
        <div class="content">
            <h2>Hello {{clientName}}!</h2>
            <p>We received a response regarding your application for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>.</p>
            
            <div class="response-details">
                <h3>Response Type: {{responseType}}</h3>
                <p><strong>Company:</strong> {{companyName}}</p>
                <p><strong>Position:</strong> {{jobTitle}}</p>
                <p><strong>Received:</strong> {{responseDate}}</p>
                <p><strong>Next Steps:</strong> {{nextSteps}}</p>
            </div>
            
            <p>{{responseMessage}}</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{applicationUrl}}" class="button">View Application Details</a>
            </div>
            
            <p>Your career coach <strong>{{workerName}}</strong> has been notified and will be in touch with you soon to discuss the next steps.</p>
            
            <p>If you have any questions, please don''t hesitate to reach out to us at <a href="mailto:support@interviewsfirst.com">support@interviewsfirst.com</a>.</p>
            
            <p>Best regards,<br>The InterviewsFirst Team</p>
        </div>
        <div class="footer">
            <p>This email was sent to {{clientEmail}}. If you no longer wish to receive these emails, you can <a href="{{unsubscribeUrl}}">unsubscribe here</a>.</p>
        </div>
    </div>
</body>
</html>',
'Response from {{companyName}} - {{jobTitle}}

Hello {{clientName}}!

We received a response regarding your application for the {{jobTitle}} position at {{companyName}}.

Response Type: {{responseType}}
Company: {{companyName}}
Position: {{jobTitle}}
Received: {{responseDate}}
Next Steps: {{nextSteps}}

{{responseMessage}}

View application details: {{applicationUrl}}

Your career coach {{workerName}} has been notified and will be in touch with you soon to discuss the next steps.

If you have any questions, please don''t hesitate to reach out to us at support@interviewsfirst.com.

Best regards,
The InterviewsFirst Team

This email was sent to {{clientEmail}}. If you no longer wish to receive these emails, you can unsubscribe here: {{unsubscribeUrl}}',
'["clientName", "companyName", "jobTitle", "responseType", "responseDate", "nextSteps", "responseMessage", "applicationUrl", "workerName", "clientEmail", "unsubscribeUrl"]',
'notification');

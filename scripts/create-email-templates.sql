-- Create default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, variables, category, is_active)
VALUES 
('client_welcome', 'Welcome to Interviews First!', 
 '<h1>Welcome {{clientName}}!</h1><p>Your career coach {{workerName}} will be in touch soon.</p>',
 'Welcome {{clientName}}! Your career coach {{workerName}} will be in touch soon.',
 '["clientName", "workerName", "workerEmail", "workerPhone", "clientEmail", "dashboardUrl", "unsubscribeUrl"]',
 'welcome', true),
('interview_scheduled', 'Interview Scheduled - {{companyName}}',
 '<h1>Interview Scheduled!</h1><p>Your interview with {{companyName}} for {{jobTitle}} has been scheduled.</p>',
 'Interview Scheduled! Your interview with {{companyName}} for {{jobTitle}} has been scheduled.',
 '["clientName", "companyName", "jobTitle", "interviewDate", "interviewTime", "interviewType", "interviewLocation", "interviewUrl", "workerName", "workerEmail", "clientEmail", "unsubscribeUrl"]',
 'interview', true),
('job_response', 'Job Application Response',
 '<h1>Job Application Response</h1><p>You have received a response to your job application.</p>',
 'Job Application Response: You have received a response to your job application.',
 '["clientName", "companyName", "jobTitle", "responseContent", "workerName", "workerEmail", "clientEmail", "unsubscribeUrl"]',
 'notification', true)
ON CONFLICT (name) DO NOTHING;

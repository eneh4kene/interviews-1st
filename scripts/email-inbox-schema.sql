-- Email Inbox Schema
-- This table stores incoming emails and replies

CREATE TABLE IF NOT EXISTS email_inbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
    is_read BOOLEAN DEFAULT false,
    thread_id VARCHAR(255) NOT NULL,
    reply_to_email VARCHAR(255),
    client_id UUID REFERENCES clients(id),
    application_email_id UUID REFERENCES application_emails(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_inbox_thread_id ON email_inbox(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_inbox_client_id ON email_inbox(client_id);
CREATE INDEX IF NOT EXISTS idx_email_inbox_status ON email_inbox(status);
CREATE INDEX IF NOT EXISTS idx_email_inbox_received_at ON email_inbox(received_at);
CREATE INDEX IF NOT EXISTS idx_email_inbox_from_email ON email_inbox(from_email);

-- Insert some sample emails for testing
INSERT INTO email_inbox (
    from_email, from_name, subject, content, thread_id, reply_to_email, client_id, status
) VALUES 
(
    'john.doe@example.com',
    'John Doe',
    'Re: Your Application for Software Engineer at Google',
    'Hi there,\n\nThank you for your interest in the Software Engineer position at Google. We have reviewed your application and would like to schedule an interview with you.\n\nPlease let us know your availability for next week.\n\nBest regards,\nJohn Doe\nGoogle HR',
    'thread_1234567890_abc123',
    'noreply@careers.interviewsfirst-dev.com',
    (SELECT id FROM clients LIMIT 1),
    'unread'
),
(
    'sarah.smith@techcorp.com',
    'Sarah Smith',
    'Interview Confirmation - Software Engineer Position',
    'Hello,\n\nThis is to confirm your interview for the Software Engineer position at TechCorp.\n\nDate: March 15, 2024\nTime: 2:00 PM EST\nLocation: Virtual (Zoom link will be sent)\n\nPlease prepare a 10-minute presentation about your previous projects.\n\nLooking forward to meeting you!\n\nSarah Smith\nTechCorp HR',
    'thread_1234567891_def456',
    'noreply@tech-careers.interviewsfirst-dev.com',
    (SELECT id FROM clients LIMIT 1),
    'unread'
),
(
    'mike.johnson@financebank.com',
    'Mike Johnson',
    'Thank you for your application',
    'Dear Applicant,\n\nThank you for your interest in the Financial Analyst position at FinanceBank.\n\nWe have received your application and will review it carefully. We will get back to you within 5-7 business days.\n\nIf you have any questions, please don''t hesitate to contact us.\n\nBest regards,\nMike Johnson\nFinanceBank HR',
    'thread_1234567892_ghi789',
    'noreply@finance-careers.interviewsfirst-dev.com',
    (SELECT id FROM clients LIMIT 1),
    'read'
);

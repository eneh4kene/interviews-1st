-- AI Apply Core Services Database Schema
-- This script adds the essential tables for the AI Apply system without n8n integration

-- Client emails table for managing client-specific email addresses
CREATE TABLE IF NOT EXISTS client_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  from_email VARCHAR(255) NOT NULL UNIQUE,
  from_name VARCHAR(255) NOT NULL,
  reply_to_email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI applications table for tracking AI-generated applications
CREATE TABLE IF NOT EXISTS ai_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id VARCHAR(255) NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_website VARCHAR(255),
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'email_discovery', 'generating_content', 'awaiting_approval', 'approved', 'submitted', 'successful', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  wait_for_approval BOOLEAN DEFAULT false,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  ai_generated_content JSONB,
  worker_notes TEXT,
  target_email VARCHAR(255),
  email_confidence_score DECIMAL(3,2),
  alternative_emails TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email templates table for client-specific email templates
CREATE TABLE IF NOT EXISTS client_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application queue table for managing processing queue
CREATE TABLE IF NOT EXISTS application_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_application_id UUID REFERENCES ai_applications(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email discovery results table for caching email discovery results
CREATE TABLE IF NOT EXISTS email_discovery_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  company_website VARCHAR(255),
  primary_email VARCHAR(255) NOT NULL,
  confidence_score DECIMAL(3,2),
  discovery_method VARCHAR(50) NOT NULL,
  alternative_emails TEXT[],
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_emails_client_id ON client_emails(client_id);
CREATE INDEX IF NOT EXISTS idx_client_emails_from_email ON client_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_ai_applications_client_id ON ai_applications(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_applications_worker_id ON ai_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_ai_applications_status ON ai_applications(status);
CREATE INDEX IF NOT EXISTS idx_ai_applications_created_at ON ai_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_client_email_templates_client_id ON client_email_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_application_queue_status ON application_queue(status);
CREATE INDEX IF NOT EXISTS idx_application_queue_priority ON application_queue(priority);
CREATE INDEX IF NOT EXISTS idx_email_discovery_company ON email_discovery_results(company_name);
CREATE INDEX IF NOT EXISTS idx_email_discovery_expires ON email_discovery_results(expires_at);

-- Add unique constraints
ALTER TABLE client_email_templates 
ADD CONSTRAINT IF NOT EXISTS unique_client_template_name 
UNIQUE (client_id, template_name);

-- Add foreign key constraints
ALTER TABLE application_queue 
ADD CONSTRAINT IF NOT EXISTS fk_application_queue_ai_application 
FOREIGN KEY (ai_application_id) REFERENCES ai_applications(id) ON DELETE CASCADE;

-- Add check constraints
ALTER TABLE ai_applications 
ADD CONSTRAINT IF NOT EXISTS check_progress_range 
CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE email_discovery_results 
ADD CONSTRAINT IF NOT EXISTS check_confidence_score 
CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_client_emails_updated_at 
    BEFORE UPDATE ON client_emails 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_applications_updated_at 
    BEFORE UPDATE ON ai_applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_email_templates_updated_at 
    BEFORE UPDATE ON client_email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

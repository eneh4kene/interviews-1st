-- AI Apply System Database Schema Updates
-- This script enhances the existing applications table and adds new tables for AI apply functionality

-- Add new columns to existing applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS job_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_website VARCHAR(500),
ADD COLUMN IF NOT EXISTS apply_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS application_type VARCHAR(20) DEFAULT 'manual' CHECK (application_type IN ('ai', 'manual')),
ADD COLUMN IF NOT EXISTS ai_processing_status VARCHAR(50) DEFAULT 'pending' CHECK (ai_processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS n8n_execution_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS customizations JSONB,
ADD COLUMN IF NOT EXISTS worker_notes TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add unique constraint to prevent duplicate applications
ALTER TABLE applications 
ADD CONSTRAINT IF NOT EXISTS unique_client_job_application 
UNIQUE (client_id, job_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_application_type ON applications(application_type);
CREATE INDEX IF NOT EXISTS idx_applications_ai_processing_status ON applications(ai_processing_status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);

-- Add company_website column to jobs table if it doesn't exist
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS company_website VARCHAR(500);

-- Create job classifications table for AI applicability tracking
CREATE TABLE IF NOT EXISTS job_classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(255) NOT NULL,
    is_ai_applicable BOOLEAN NOT NULL DEFAULT false,
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    classification_reasons TEXT[],
    application_method VARCHAR(20) DEFAULT 'manual' CHECK (application_method IN ('form', 'email', 'manual')),
    last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(job_id)
);

-- Create index for job classifications
CREATE INDEX IF NOT EXISTS idx_job_classifications_ai_applicable ON job_classifications(is_ai_applicable);
CREATE INDEX IF NOT EXISTS idx_job_classifications_confidence ON job_classifications(confidence_score);

-- Create AI apply queue table for processing
CREATE TABLE IF NOT EXISTS ai_apply_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    job_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 1, -- 1 = high, 2 = medium, 3 = low
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    n8n_execution_id VARCHAR(255),
    processing_started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AI apply queue
CREATE INDEX IF NOT EXISTS idx_ai_apply_queue_status ON ai_apply_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_apply_queue_priority ON ai_apply_queue(priority);
CREATE INDEX IF NOT EXISTS idx_ai_apply_queue_client_id ON ai_apply_queue(client_id);

-- Create application email tracking table (enhanced)
CREATE TABLE IF NOT EXISTS application_email_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    proxy_email VARCHAR(255) NOT NULL,
    company_email VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    email_type VARCHAR(50) DEFAULT 'application' CHECK (email_type IN ('application', 'follow_up', 'response')),
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    replied_at TIMESTAMP,
    bounced_at TIMESTAMP,
    provider_message_id VARCHAR(255),
    provider_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for email tracking
CREATE INDEX IF NOT EXISTS idx_application_email_tracking_application_id ON application_email_tracking(application_id);
CREATE INDEX IF NOT EXISTS idx_application_email_tracking_client_id ON application_email_tracking(client_id);
CREATE INDEX IF NOT EXISTS idx_application_email_tracking_status ON application_email_tracking(status);

-- Create client job preferences cache table for faster filtering
CREATE TABLE IF NOT EXISTS client_job_preferences_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    preferences_hash VARCHAR(64) NOT NULL, -- Hash of preferences for cache invalidation
    job_ids TEXT[] NOT NULL, -- Array of job IDs that match preferences
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    
    UNIQUE(client_id, preferences_hash)
);

-- Create index for cache table
CREATE INDEX IF NOT EXISTS idx_client_job_preferences_cache_client_id ON client_job_preferences_cache(client_id);
CREATE INDEX IF NOT EXISTS idx_client_job_preferences_cache_expires_at ON client_job_preferences_cache(expires_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to new tables
CREATE TRIGGER update_job_classifications_updated_at 
    BEFORE UPDATE ON job_classifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_apply_queue_updated_at 
    BEFORE UPDATE ON ai_apply_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_email_tracking_updated_at 
    BEFORE UPDATE ON application_email_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample job classifications for testing
INSERT INTO job_classifications (job_id, is_ai_applicable, confidence_score, classification_reasons, application_method)
VALUES 
    ('sample-job-1', true, 0.95, ARRAY['Has company website', 'Has apply URL'], 'form'),
    ('sample-job-2', true, 0.85, ARRAY['Has company website', 'Email discovery required'], 'email'),
    ('sample-job-3', false, 0.90, ARRAY['No company website'], 'manual')
ON CONFLICT (job_id) DO NOTHING;

-- Add missing fields to applications table
-- These fields are used by the create application API

-- Add job_id field for external job tracking
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS job_id VARCHAR(255);

-- Add company_website field
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS company_website VARCHAR(255);

-- Add apply_url field for external job applications
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS apply_url VARCHAR(1000);

-- Add application_type field to distinguish between manual and AI applications
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS application_type VARCHAR(20) DEFAULT 'manual' 
CHECK (application_type IN ('manual', 'ai'));

-- Add index for job_id lookups
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id) WHERE job_id IS NOT NULL;

-- Add index for application_type
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(application_type);

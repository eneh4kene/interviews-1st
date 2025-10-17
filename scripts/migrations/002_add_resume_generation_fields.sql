-- Add resume generation fields to applications table
-- This extends the applications table to support AI resume generation

-- Add resume generation fields to existing applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS resume_generation_status VARCHAR(50) DEFAULT NULL 
CHECK (resume_generation_status IN ('queued', 'processing', 'generating', 'completed', 'failed'));

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS resume_generation_progress INTEGER DEFAULT NULL 
CHECK (resume_generation_progress >= 0 AND resume_generation_progress <= 100);

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS generated_resume_url TEXT;

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS generated_resume_filename VARCHAR(255);

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS resume_generation_error TEXT;

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS resume_generation_retry_count INTEGER DEFAULT 0;

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS resume_generation_max_retries INTEGER DEFAULT 3;

-- Add index for resume generation status
CREATE INDEX IF NOT EXISTS idx_applications_resume_generation_status 
ON applications(resume_generation_status) 
WHERE resume_generation_status IS NOT NULL;

-- Add index for applications with resume generation
CREATE INDEX IF NOT EXISTS idx_applications_with_resume_generation 
ON applications(client_id, resume_generation_status) 
WHERE resume_generation_status IS NOT NULL;

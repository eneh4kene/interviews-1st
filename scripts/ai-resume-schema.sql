-- AI Resume Generation Database Schema
-- This script adds tables for the AI Resume generation system

-- AI resume generations table for tracking resume-only applications
CREATE TABLE IF NOT EXISTS ai_resume_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id VARCHAR(255) NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_website VARCHAR(255),
  description_snippet TEXT,
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'generating', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  original_resume_id UUID REFERENCES resumes(id),
  original_resume_url TEXT,
  generated_resume_url TEXT,
  generated_resume_filename VARCHAR(255),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_resume_generations_client_id ON ai_resume_generations(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_resume_generations_worker_id ON ai_resume_generations(worker_id);
CREATE INDEX IF NOT EXISTS idx_ai_resume_generations_status ON ai_resume_generations(status);
CREATE INDEX IF NOT EXISTS idx_ai_resume_generations_created_at ON ai_resume_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_resume_generations_job_id ON ai_resume_generations(job_id);

-- Add check constraints
ALTER TABLE ai_resume_generations 
ADD CONSTRAINT IF NOT EXISTS check_progress_range 
CHECK (progress >= 0 AND progress <= 100);

-- Add updated_at trigger
CREATE TRIGGER update_ai_resume_generations_updated_at 
    BEFORE UPDATE ON ai_resume_generations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

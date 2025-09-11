
-- Add caching columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preference_hash VARCHAR(255);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours');

-- Add classification columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_ai_applicable BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS classification_reasons TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_method VARCHAR(20) DEFAULT 'manual';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_preference_hash ON jobs(preference_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_jobs_cached_at ON jobs(cached_at);
CREATE INDEX IF NOT EXISTS idx_jobs_is_ai_applicable ON jobs(is_ai_applicable);
CREATE INDEX IF NOT EXISTS idx_jobs_external_id_source ON jobs(external_id, source);


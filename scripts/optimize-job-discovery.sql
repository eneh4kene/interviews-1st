-- Job Discovery Performance Optimization
-- This script adds indexes and optimizations for better job filtering performance

-- Add indexes for better job filtering performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_ai_applicable 
ON jobs(auto_apply_status) 
WHERE auto_apply_status = 'eligible';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_company_website 
ON jobs(company_website) 
WHERE company_website IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_posted_date 
ON jobs(posted_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_source_posted_date 
ON jobs(source, posted_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_salary_range 
ON jobs(salary_min, salary_max) 
WHERE salary_min IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_work_location 
ON jobs(work_location) 
WHERE work_location IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_job_type 
ON jobs(job_type) 
WHERE job_type IS NOT NULL;

-- Add composite index for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_ai_website_date 
ON jobs(auto_apply_status, company_website, posted_date DESC) 
WHERE auto_apply_status = 'eligible' AND company_website IS NOT NULL;

-- Add full-text search index for better text searching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_title_gin 
ON jobs USING GIN(to_tsvector('english', title));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_company_gin 
ON jobs USING GIN(to_tsvector('english', company));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_description_gin 
ON jobs USING GIN(to_tsvector('english', description_snippet));

-- Add partial indexes for common filter patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_recent_ai_eligible 
ON jobs(posted_date DESC, company_website) 
WHERE posted_date >= NOW() - INTERVAL '30 days' 
AND auto_apply_status = 'eligible' 
AND company_website IS NOT NULL;

-- Add index for client preferences lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_preferences_client_status 
ON job_preferences(client_id, status) 
WHERE status = 'active';

-- Add index for applications to prevent duplicates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_client_job 
ON applications(client_id, job_id) 
WHERE job_id IS NOT NULL;

-- Analyze tables to update statistics
ANALYZE jobs;
ANALYZE job_preferences;
ANALYZE applications;

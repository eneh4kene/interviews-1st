-- InterviewsFirst Database Schema
-- Initial setup script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('WORKER', 'MANAGER', 'ADMIN', 'CLIENT')),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    profile_picture VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'placed')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
    total_interviews INTEGER DEFAULT 0,
    total_paid INTEGER DEFAULT 0,
    is_new BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resumes table
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job preferences table
CREATE TABLE job_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    location VARCHAR(255) NOT NULL,
    work_type VARCHAR(20) NOT NULL CHECK (work_type IN ('remote', 'hybrid', 'onsite')),
    visa_sponsorship BOOLEAN DEFAULT false,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'achieved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Applications table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    job_preference_id UUID REFERENCES job_preferences(id),
    resume_id UUID REFERENCES resumes(id),
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    application_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('applied', 'interviewing', 'offered', 'rejected', 'accepted')),
    interview_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interviews table
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    scheduled_date TIMESTAMP NOT NULL,
    interview_type VARCHAR(20) NOT NULL CHECK (interview_type IN ('phone', 'video', 'onsite', 'technical', 'behavioral')),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'client_accepted', 'client_declined', 'completed', 'cancelled')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    payment_amount DECIMAL(10,2) DEFAULT 10.00,
    payment_currency VARCHAR(3) DEFAULT 'GBP',
    client_response_date TIMESTAMP,
    client_response_notes TEXT,
    worker_notes TEXT,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_payment_intent_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    payment_method VARCHAR(50),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client notifications table
CREATE TABLE client_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('interview_scheduled', 'payment_required', 'payment_successful', 'interview_reminder')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_required BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interview offers table (for magic links)
CREATE TABLE interview_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'SENT' CHECK (status IN ('SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED')),
    stripe_session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table for aggregated job listings
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255), -- Original ID from aggregator
    title VARCHAR(500) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    salary VARCHAR(255),
    description_snippet TEXT NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('adzuna', 'jooble', 'indeed', 'ziprecruiter', 'workable', 'greenhouse')),
    posted_date TIMESTAMP NOT NULL,
    apply_url VARCHAR(1000) NOT NULL,
    -- Additional fields for enhanced functionality
    job_type VARCHAR(20) CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship', 'temporary', 'freelance')),
    work_location VARCHAR(20) CHECK (work_location IN ('remote', 'hybrid', 'onsite')),
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'GBP',
    requirements TEXT[], -- Array of requirements
    benefits TEXT[], -- Array of benefits
    -- Auto-apply functionality
    auto_apply_status VARCHAR(20) DEFAULT 'pending_review' CHECK (auto_apply_status IN ('eligible', 'ineligible', 'pending_review', 'applied', 'failed', 'blacklisted')),
    auto_apply_notes TEXT,
    -- Deduplication fields
    title_hash VARCHAR(64), -- Hash of title for deduplication
    company_location_hash VARCHAR(64), -- Hash of company + location for deduplication
    -- Internal tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_clients_worker_id ON clients(worker_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_is_new ON clients(is_new);
CREATE INDEX idx_applications_client_id ON applications(client_id);
CREATE INDEX idx_interviews_client_id ON interviews(client_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_payments_interview_id ON payments(interview_id);
CREATE INDEX idx_notifications_client_id ON client_notifications(client_id);
CREATE INDEX idx_notifications_is_read ON client_notifications(is_read);
CREATE INDEX idx_offers_token ON interview_offers(token);
CREATE INDEX idx_offers_expires_at ON interview_offers(expires_at);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Job-specific indexes
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_posted_date ON jobs(posted_date);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_job_type ON jobs(job_type);
CREATE INDEX idx_jobs_work_location ON jobs(work_location);
CREATE INDEX idx_jobs_auto_apply_status ON jobs(auto_apply_status);
CREATE INDEX idx_jobs_title_hash ON jobs(title_hash);
CREATE INDEX idx_jobs_company_location_hash ON jobs(company_location_hash);
CREATE INDEX idx_jobs_external_id_source ON jobs(external_id, source);

-- Add unique constraint for deduplication
ALTER TABLE jobs ADD CONSTRAINT jobs_external_id_source_unique UNIQUE (external_id, source);

-- Full-text search index for job search
CREATE INDEX idx_jobs_search ON jobs USING gin(to_tsvector('english', title || ' ' || company || ' ' || description_snippet));

-- Composite indexes for common queries
CREATE INDEX idx_jobs_location_posted_date ON jobs(location, posted_date);
CREATE INDEX idx_jobs_source_posted_date ON jobs(source, posted_date);
CREATE INDEX idx_jobs_auto_apply_posted_date ON jobs(auto_apply_status, posted_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_preferences_updated_at BEFORE UPDATE ON job_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_notifications_updated_at BEFORE UPDATE ON client_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interview_offers_updated_at BEFORE UPDATE ON interview_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
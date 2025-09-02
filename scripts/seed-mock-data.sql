-- Seed Mock Data for InterviewsFirst Platform
-- Run this in your Neon PostgreSQL database after running init-db.sql

-- Clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM payments;
-- DELETE FROM interview_offers;
-- DELETE FROM client_notifications;
-- DELETE FROM interviews;
-- DELETE FROM applications;
-- DELETE FROM resumes;
-- DELETE FROM job_preferences;
-- DELETE FROM clients;
-- DELETE FROM users;
-- DELETE FROM refresh_tokens;
-- DELETE FROM jobs;

-- Insert mock users
-- Insert or update users with real bcrypt hashes
-- ADMIN password: admin@admin
-- WORKER password: password@worker
-- CLIENT password: password@client
INSERT INTO users (id, email, name, role, password_hash, is_active, two_factor_enabled) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'admin@interview-me.com', 'Admin User', 'ADMIN', '$2b$10$l84PL.Lss3yLG/kSE2VJme/2l4DPCZfeHGppQh5UG5S9ARpaH0grW', true, false),
    ('550e8400-e29b-41d4-a716-446655440002', 'worker1@interview-me.com', 'John Smith', 'WORKER', '$2b$10$Wr9hV2ThMbCscbt8i0ZL6uCN2SG0jyA55SiVXQPMEeN22L59.YRgm', true, false),
    ('550e8400-e29b-41d4-a716-446655440003', 'worker2@interview-me.com', 'Jane Doe', 'WORKER', '$2b$10$Wr9hV2ThMbCscbt8i0ZL6uCN2SG0jyA55SiVXQPMEeN22L59.YRgm', true, false),
    ('550e8400-e29b-41d4-a716-446655440004', 'client1@email.com', 'Sarah Johnson', 'CLIENT', '$2b$10$ogxsLA3t5VVb31TaMJwIR.p.Qs6EZCLlWadak5Qy6r71j4d7RTt2S', true, false),
    ('550e8400-e29b-41d4-a716-446655440005', 'client2@email.com', 'Michael Chen', 'CLIENT', '$2b$10$ogxsLA3t5VVb31TaMJwIR.p.Qs6EZCLlWadak5Qy6r71j4d7RTt2S', true, false),
    ('550e8400-e29b-41d4-a716-446655440006', 'client3@email.com', 'Emily Rodriguez', 'CLIENT', '$2b$10$ogxsLA3t5VVb31TaMJwIR.p.Qs6EZCLlWadak5Qy6r71j4d7RTt2S', true, false),
    ('550e8400-e29b-41d4-a716-446655440007', 'client4@email.com', 'Alex Thompson', 'CLIENT', '$2b$10$ogxsLA3t5VVb31TaMJwIR.p.Qs6EZCLlWadak5Qy6r71j4d7RTt2S', true, false),
    ('550e8400-e29b-41d4-a716-446655440008', 'client5@email.com', 'Jessica Kim', 'CLIENT', '$2b$10$ogxsLA3t5VVb31TaMJwIR.p.Qs6EZCLlWadak5Qy6r71j4d7RTt2S', true, false)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active,
    two_factor_enabled = EXCLUDED.two_factor_enabled;

-- Insert mock clients
INSERT INTO clients (id, worker_id, name, email, phone, linkedin_url, status, payment_status, total_interviews, total_paid, is_new, assigned_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'sarah.johnson@email.com', '+1 (555) 123-4567', 'https://linkedin.com/in/sarahjohnson', 'active', 'pending', 2, 20, false, '2024-01-15 10:00:00'),
    ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', 'Michael Chen', 'michael.chen@email.com', '+1 (555) 234-5678', 'https://linkedin.com/in/michaelchen', 'active', 'paid', 1, 10, false, '2024-01-10 14:30:00'),
    ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', 'Emily Rodriguez', 'emily.rodriguez@email.com', '+1 (555) 345-6789', 'https://linkedin.com/in/emilyrodriguez', 'placed', 'paid', 3, 30, false, '2023-12-20 09:15:00'),
    ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 'Alex Thompson', 'alex.thompson@email.com', '+1 (555) 456-7890', 'https://linkedin.com/in/alexthompson', 'active', 'pending', 0, 0, true, NOW() - INTERVAL '24 hours'),
    ('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440002', 'Jessica Kim', 'jessica.kim@email.com', '+1 (555) 567-8901', 'https://linkedin.com/in/jessicakim', 'active', 'pending', 0, 0, true, NOW() - INTERVAL '12 hours');

-- Insert mock resumes
INSERT INTO resumes (id, client_id, name, file_url, is_default) VALUES
    ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', 'Sarah_Johnson_CV.pdf', '/uploads/resumes/sarah_johnson_cv.pdf', true),
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', 'Michael_Chen_Resume.pdf', '/uploads/resumes/michael_chen_resume.pdf', true),
    ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440012', 'Emily_Rodriguez_CV.pdf', '/uploads/resumes/emily_rodriguez_cv.pdf', true),
    ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440013', 'Alex_Thompson_Resume.pdf', '/uploads/resumes/alex_thompson_resume.pdf', true),
    ('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440014', 'Jessica_Kim_Resume.pdf', '/uploads/resumes/jessica_kim_resume.pdf', true);

-- Insert mock job preferences
INSERT INTO job_preferences (id, client_id, title, company, location, work_type, visa_sponsorship, salary_min, salary_max, salary_currency, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440010', 'Senior DevOps Engineer', 'Tech Company', 'London, UK', 'hybrid', false, 70000, 90000, 'GBP', 'active'),
    ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440011', 'Full Stack Developer', 'Startup', 'Manchester, UK', 'remote', true, 50000, 70000, 'GBP', 'active'),
    ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440012', 'Product Manager', 'Enterprise', 'Birmingham, UK', 'onsite', false, 60000, 80000, 'GBP', 'active'),
    ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440013', 'Data Scientist', 'FinTech', 'Edinburgh, UK', 'hybrid', true, 55000, 75000, 'GBP', 'active'),
    ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440014', 'UX Designer', 'Design Agency', 'Bristol, UK', 'remote', false, 45000, 65000, 'GBP', 'active');

-- Insert mock applications
INSERT INTO applications (id, client_id, job_preference_id, resume_id, company_name, job_title, application_date, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440020', 'TechCorp', 'Senior DevOps Engineer', '2024-01-20 10:00:00', 'interviewing'),
    ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440021', 'StartupXYZ', 'Full Stack Developer', '2024-01-18 14:30:00', 'applied'),
    ('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440022', 'Enterprise Inc', 'Product Manager', '2024-01-15 09:15:00', 'offered'),
    ('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440023', 'FinTech Solutions', 'Data Scientist', '2024-01-22 11:00:00', 'applied'),
    ('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440024', 'Design Studio', 'UX Designer', '2024-01-21 16:00:00', 'applied');

-- Insert mock interviews
INSERT INTO interviews (id, application_id, client_id, company_name, job_title, scheduled_date, interview_type, status, payment_status, payment_amount) VALUES
    ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440010', 'TechCorp', 'Senior DevOps Engineer', '2024-01-25 14:00:00', 'video', 'scheduled', 'pending', 10.00),
    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440011', 'StartupXYZ', 'Full Stack Developer', '2024-01-26 10:00:00', 'phone', 'scheduled', 'pending', 10.00),
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440012', 'Enterprise Inc', 'Product Manager', '2024-01-24 15:00:00', 'onsite', 'completed', 'paid', 10.00);

-- Insert mock payments
INSERT INTO payments (id, interview_id, client_id, amount, currency, status, payment_method, paid_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440012', 10.00, 'GBP', 'completed', 'stripe', '2024-01-24 15:30:00');

-- Insert mock jobs (aggregated from external sources)
INSERT INTO jobs (id, external_id, title, company, location, salary, description_snippet, source, posted_date, apply_url, job_type, work_location, salary_min, salary_max, salary_currency, auto_apply_status) VALUES
    ('550e8400-e29b-41d4-a716-446655440070', 'job001', 'Senior DevOps Engineer', 'TechCorp', 'London, UK', '£70,000 - £90,000', 'We are looking for a Senior DevOps Engineer to join our growing team...', 'adzuna', '2024-01-20 09:00:00', 'https://techcorp.com/careers/devops', 'full-time', 'hybrid', 70000, 90000, 'GBP', 'eligible'),
    ('550e8400-e29b-41d4-a716-446655440071', 'job002', 'Full Stack Developer', 'StartupXYZ', 'Manchester, UK', '£50,000 - £70,000', 'Join our fast-growing startup as a Full Stack Developer...', 'jooble', '2024-01-19 10:00:00', 'https://startupxyz.com/jobs/fullstack', 'full-time', 'remote', 50000, 70000, 'GBP', 'eligible'),
    ('550e8400-e29b-41d4-a716-446655440072', 'job003', 'Product Manager', 'Enterprise Inc', 'Birmingham, UK', '£60,000 - £80,000', 'We are seeking an experienced Product Manager...', 'indeed', '2024-01-18 11:00:00', 'https://enterprise.com/careers/pm', 'full-time', 'onsite', 60000, 80000, 'GBP', 'eligible');

-- Insert mock client notifications
INSERT INTO client_notifications (id, client_id, type, title, message, is_read, action_required) VALUES
    ('550e8400-e29b-41d4-a716-446655440080', '550e8400-e29b-41d4-a716-446655440010', 'interview_scheduled', 'Interview Scheduled', 'Your interview with TechCorp has been scheduled for January 25th at 2:00 PM.', false, true),
    ('550e8400-e29b-41d4-a716-446655440081', '550e8400-e29b-41d4-a716-446655440011', 'payment_required', 'Payment Required', 'Please complete payment for your upcoming interview with StartupXYZ.', false, true),
    ('550e8400-e29b-41d4-a716-446655440082', '550e8400-e29b-41d4-a716-446655440012', 'payment_successful', 'Payment Successful', 'Your payment for the Enterprise Inc interview has been processed successfully.', true, false);

-- Verify the data
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Clients', COUNT(*) FROM clients
UNION ALL
SELECT 'Resumes', COUNT(*) FROM resumes
UNION ALL
SELECT 'Job Preferences', COUNT(*) FROM job_preferences
UNION ALL
SELECT 'Applications', COUNT(*) FROM applications
UNION ALL
SELECT 'Interviews', COUNT(*) FROM interviews
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'Jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'Notifications', COUNT(*) FROM client_notifications;

-- Show sample client data
SELECT 
    c.name,
    c.email,
    c.status,
    c.total_interviews,
    c.total_paid,
    r.name as resume_name,
    jp.title as job_preference
FROM clients c
LEFT JOIN resumes r ON c.id = r.client_id AND r.is_default = true
LEFT JOIN job_preferences jp ON c.id = jp.client_id AND jp.status = 'active'
WHERE c.worker_id = '550e8400-e29b-41d4-a716-446655440002';

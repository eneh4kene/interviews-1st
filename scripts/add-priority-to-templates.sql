-- Add is_default column to email_templates table
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Update existing templates to be default for their categories
UPDATE email_templates SET is_default = true WHERE name = 'client_welcome' AND category = 'welcome';
UPDATE email_templates SET is_default = true WHERE name = 'interview_scheduled' AND category = 'interview';
UPDATE email_templates SET is_default = true WHERE name = 'job_response' AND category = 'notification';

-- Add index for better performance on template selection queries
CREATE INDEX IF NOT EXISTS idx_email_templates_category_default 
ON email_templates (category, is_default, is_active);

-- Add index for template name lookups (backward compatibility)
CREATE INDEX IF NOT EXISTS idx_email_templates_name_active 
ON email_templates (name, is_active);

-- Add unique constraint to ensure only one default template per category
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_unique_default_per_category 
ON email_templates (category) WHERE is_default = true AND is_active = true;

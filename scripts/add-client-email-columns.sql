-- Add missing email-related columns to clients table
-- This migration adds the columns that the ClientDomainService expects

-- Add sender_email column for custom client email addresses
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);

-- Add custom_domain column for client's custom domain
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);

-- Add domain_verified column to track domain verification status
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT false;

-- Add html_content column to email_inbox table (referenced in inbound email handler)
ALTER TABLE email_inbox 
ADD COLUMN IF NOT EXISTS html_content TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_sender_email ON clients(sender_email);
CREATE INDEX IF NOT EXISTS idx_clients_custom_domain ON clients(custom_domain);
CREATE INDEX IF NOT EXISTS idx_clients_domain_verified ON clients(domain_verified);

-- Update existing clients to have generated sender emails if they don't have them
UPDATE clients 
SET sender_email = LOWER(REPLACE(REPLACE(name, ' ', '.'), '..', '.')) || '@interviewsfirst.com'
WHERE sender_email IS NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN clients.sender_email IS 'Custom email address for sending emails on behalf of this client';
COMMENT ON COLUMN clients.custom_domain IS 'Custom domain configured for this client (e.g., techcorp.com)';
COMMENT ON COLUMN clients.domain_verified IS 'Whether the custom domain has been verified with SendGrid';
COMMENT ON COLUMN email_inbox.html_content IS 'HTML content of the received email';

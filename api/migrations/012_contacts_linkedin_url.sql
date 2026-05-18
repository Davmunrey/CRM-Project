-- Add LinkedIn profile URL to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url text;

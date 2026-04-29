-- Unique index on gmail_message_id to prevent duplicate email inserts
CREATE UNIQUE INDEX IF NOT EXISTS emails_gmail_message_id_unique
  ON emails (organization_id, gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

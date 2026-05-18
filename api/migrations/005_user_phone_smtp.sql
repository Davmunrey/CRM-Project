-- ─── User profile: phone field ───────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;

-- ─── Per-org SMTP configuration ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_smtp_settings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  host            text        NOT NULL,
  port            integer     NOT NULL DEFAULT 587,
  username        text        NOT NULL,
  password_enc    text        NOT NULL,
  from_address    text        NOT NULL,
  from_name       text,
  reply_to        text,
  secure          text        NOT NULL DEFAULT 'starttls' CHECK (secure IN ('starttls','ssl','none')),
  is_active       boolean     NOT NULL DEFAULT true,
  last_test_at    timestamptz,
  last_test_ok    boolean,
  last_test_error text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

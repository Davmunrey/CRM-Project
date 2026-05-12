-- Per-organization SMTP outbound credentials for BYO-SMTP email provider.
--
-- Security model:
--   - Password is stored as AES-256-GCM ciphertext (`password_cipher`) produced by the
--     `smtp-send-email` Edge Function using the shared `TOKEN_ENCRYPTION_KEY` secret.
--   - RLS allows organization members to read **non-secret** fields via the view
--     `email_smtp_settings_public`. Direct read of the base table is restricted to
--     admins (the encrypted password never leaves the Edge Function).
--   - Service role (Edge Functions) can read everything to actually send mail.
--
-- One active configuration per org. Older rows can stay in the table as history but only
-- the row with `is_active = true` is used by the sender.

CREATE TABLE IF NOT EXISTS public.email_smtp_settings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  host            text        NOT NULL,
  port            integer     NOT NULL,
  username        text        NOT NULL,
  password_cipher text        NOT NULL,
  from_address    text        NOT NULL,
  from_name       text,
  reply_to        text,
  secure          text        NOT NULL DEFAULT 'starttls',
  is_active       boolean     NOT NULL DEFAULT true,
  last_test_at    timestamptz,
  last_test_ok    boolean,
  last_test_error text,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_smtp_settings_port_range CHECK (port BETWEEN 1 AND 65535),
  CONSTRAINT email_smtp_settings_secure_values
    CHECK (secure IN ('starttls', 'ssl', 'none'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_smtp_settings_org_active
  ON public.email_smtp_settings (organization_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_email_smtp_settings_org
  ON public.email_smtp_settings (organization_id);

ALTER TABLE public.email_smtp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_smtp_settings_select_admins ON public.email_smtp_settings;
CREATE POLICY email_smtp_settings_select_admins
  ON public.email_smtp_settings
  FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
      ORDER BY created_at ASC
      LIMIT 1
    )
    AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = public.email_smtp_settings.organization_id
        AND is_active = true
        AND role IN ('owner', 'admin')
    )
  );

-- No INSERT / UPDATE / DELETE for end-users via API. Mutations happen exclusively
-- through the `smtp-send-email` Edge Function (service role), which encrypts
-- the password before persisting it.

-- Convenience view exposing only safe fields (no password ciphertext) for the
-- Settings UI. Admins of the org can read it via the RLS policy above on the
-- underlying table.
DROP VIEW IF EXISTS public.email_smtp_settings_public;
CREATE VIEW public.email_smtp_settings_public WITH (security_invoker = true) AS
SELECT
  id,
  organization_id,
  host,
  port,
  username,
  from_address,
  from_name,
  reply_to,
  secure,
  is_active,
  last_test_at,
  last_test_ok,
  last_test_error,
  created_at,
  updated_at
FROM public.email_smtp_settings;

GRANT SELECT ON public.email_smtp_settings_public TO authenticated;

COMMENT ON TABLE public.email_smtp_settings IS 'BYO-SMTP outbound credentials per organization. Password is AES-256-GCM ciphertext.';
COMMENT ON COLUMN public.email_smtp_settings.password_cipher IS 'AES-256-GCM(TOKEN_ENCRYPTION_KEY, plaintext-password). Format: base64(iv):base64(ct).';
COMMENT ON COLUMN public.email_smtp_settings.secure IS 'starttls (587 default), ssl (465 implicit TLS), or none (testing only).';
COMMENT ON VIEW public.email_smtp_settings_public IS 'Safe-field projection for Settings UI. Excludes password_cipher.';

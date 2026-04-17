-- Marketing consent + bulk send metadata on contacts (CRM interconnection / compliance)

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_source text;

COMMENT ON COLUMN public.contacts.marketing_opt_in IS 'User consented to marketing email; required for bulk marketing sends.';
COMMENT ON COLUMN public.contacts.marketing_opt_in_at IS 'When consent was recorded.';
COMMENT ON COLUMN public.contacts.marketing_opt_in_source IS 'e.g. import, form, manual';

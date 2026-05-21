-- Org branding, billing details, localization, and plan metadata
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS primary_color    varchar(7)   DEFAULT '#4f46e5',
  ADD COLUMN IF NOT EXISTS favicon_url      text,
  ADD COLUMN IF NOT EXISTS custom_domain    text,
  ADD COLUMN IF NOT EXISTS billing_email    text,
  ADD COLUMN IF NOT EXISTS billing_name     text,
  ADD COLUMN IF NOT EXISTS billing_address  text,
  ADD COLUMN IF NOT EXISTS billing_city     text,
  ADD COLUMN IF NOT EXISTS billing_country  varchar(2),
  ADD COLUMN IF NOT EXISTS billing_vat      text,
  ADD COLUMN IF NOT EXISTS currency         varchar(3)   DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS timezone         text         DEFAULT 'Europe/Madrid',
  ADD COLUMN IF NOT EXISTS date_format      text         DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS quote_footer     text,
  ADD COLUMN IF NOT EXISTS privacy_url      text,
  ADD COLUMN IF NOT EXISTS terms_url        text;

-- Super admin flag on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

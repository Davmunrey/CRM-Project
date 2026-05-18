-- Migration 003: Gmail tokens, thread links, webhook subscriptions, email tracking

-- ─── Gmail tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gmail_tokens (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id      uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email_address        text        NOT NULL,
  refresh_token        text,
  refresh_token_cipher text,
  access_token         text,
  token_expiry         timestamptz,
  scopes               text,
  google_sub           text,
  name                 text,
  avatar_url           text,
  is_active            boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_gmail_tokens_org ON gmail_tokens(organization_id);

-- ─── Gmail thread links ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gmail_thread_links (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       text        NOT NULL,
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      uuid        REFERENCES companies(id) ON DELETE SET NULL,
  deal_id         uuid        REFERENCES deals(id) ON DELETE SET NULL,
  source          text        NOT NULL DEFAULT 'manual' CHECK (source IN ('auto', 'manual')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_gmail_thread_links_org_user ON gmail_thread_links(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_thread_links_thread ON gmail_thread_links(thread_id);

-- ─── Webhook subscriptions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by          uuid        REFERENCES users(id) ON DELETE SET NULL,
  name                text        NOT NULL,
  target_url          text        NOT NULL,
  enabled             boolean     NOT NULL DEFAULT true,
  event_filters       text[]      NOT NULL DEFAULT ARRAY['*']::text[],
  custom_headers      jsonb       NOT NULL DEFAULT '{}',
  schema_version      smallint    NOT NULL DEFAULT 1,
  last_delivery_at    timestamptz,
  last_http_status    integer,
  last_delivery_error text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_subscriptions_https CHECK (target_url ~ '^https://')
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_org
  ON webhook_subscriptions(organization_id) WHERE enabled = true;

CREATE TABLE IF NOT EXISTS webhook_subscription_secrets (
  subscription_id uuid PRIMARY KEY REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  signing_secret  text NOT NULL
);

-- ─── Email tracking ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_tracking_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id        text        NOT NULL,
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid        REFERENCES users(id) ON DELETE SET NULL,
  contact_id      uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      uuid        REFERENCES companies(id) ON DELETE SET NULL,
  deal_id         uuid        REFERENCES deals(id) ON DELETE SET NULL,
  open_token      text        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_messages_org
  ON email_tracking_messages(organization_id, email_id);

CREATE TABLE IF NOT EXISTS email_tracking_links (
  id                   uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_message_id  uuid  NOT NULL REFERENCES email_tracking_messages(id) ON DELETE CASCADE,
  email_id             text  NOT NULL,
  organization_id      uuid  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id           uuid  REFERENCES contacts(id) ON DELETE SET NULL,
  original_url         text  NOT NULL,
  click_token          text  NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_links_org
  ON email_tracking_links(organization_id, email_id);

CREATE TABLE IF NOT EXISTS email_tracking_events (
  id                  uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_message_id uuid  NOT NULL REFERENCES email_tracking_messages(id) ON DELETE CASCADE,
  link_id             uuid  REFERENCES email_tracking_links(id) ON DELETE SET NULL,
  email_id            text  NOT NULL,
  organization_id     uuid  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id          uuid  REFERENCES contacts(id) ON DELETE SET NULL,
  event_type          text  NOT NULL CHECK (event_type IN ('open', 'click')),
  user_agent          text,
  ip_hash             text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_events_org
  ON email_tracking_events(organization_id, email_id, event_type, created_at DESC);

-- ─── API Keys ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  key_prefix      text        NOT NULL,
  key_hash        text        NOT NULL UNIQUE,
  scopes          jsonb       NOT NULL DEFAULT '[]',
  revoked_at      timestamptz,
  last_used_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;

-- ─── Lead Capture Tokens ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_capture_tokens (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label           text        NOT NULL DEFAULT '',
  token_prefix    text        NOT NULL,
  token_hash      text        NOT NULL UNIQUE,
  enabled         boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_tokens_org ON lead_capture_tokens(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_tokens_hash ON lead_capture_tokens(token_hash) WHERE enabled = true;

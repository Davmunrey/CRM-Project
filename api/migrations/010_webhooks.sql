-- Inbound webhook registrations (org registers a URL to receive signed pushes)
CREATE TABLE IF NOT EXISTS webhooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url             text NOT NULL,
  events          text[] NOT NULL DEFAULT '{"*"}',
  secret          text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(organization_id) WHERE active = true;

-- Received inbound webhook payloads (queued for async processing)
CREATE TABLE IF NOT EXISTS webhook_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payload         jsonb NOT NULL DEFAULT '{}',
  processed       boolean NOT NULL DEFAULT false,
  received_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_org_unprocessed
  ON webhook_events(organization_id, received_at)
  WHERE processed = false;

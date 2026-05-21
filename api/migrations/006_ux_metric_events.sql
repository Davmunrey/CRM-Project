-- UX telemetry events (fire-and-forget, non-critical)
CREATE TABLE IF NOT EXISTS ux_metric_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  meta            jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ux_metric_events_org ON ux_metric_events (organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ux_metric_events_action ON ux_metric_events (action, occurred_at DESC);

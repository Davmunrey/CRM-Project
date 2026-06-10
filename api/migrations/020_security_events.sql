-- ─────────────────────────────────────────────────────────────────────────────
-- 020_security_events.sql — tamper-evident security event log (SOC2 CC7 / ISO A.12.4)
--
-- Append-only record of authentication & account-security events. Distinct from
-- audit_log (which is org-scoped business activity): security_events also captures
-- events with no org/actor context (e.g. a failed login for an unknown email),
-- so organization_id and actor_user_id are NULLABLE.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text        NOT NULL,
  actor_user_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  actor_email     text,
  organization_id uuid        REFERENCES organizations(id) ON DELETE SET NULL,
  ip              text,
  user_agent      text,
  detail          text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_actor   ON security_events (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_org     ON security_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type    ON security_events (event_type, created_at DESC);

-- Sprint 5: Admin panel enhancements
-- Org suspension + impersonation audit log

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial'));

CREATE TABLE IF NOT EXISTS impersonation_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id  UUID NOT NULL REFERENCES users(id),
  target_org_id   UUID NOT NULL REFERENCES organizations(id),
  target_user_id  UUID NOT NULL REFERENCES users(id),
  impersonated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS impersonation_logs_admin ON impersonation_logs (super_admin_id, impersonated_at DESC);
CREATE INDEX IF NOT EXISTS impersonation_logs_org ON impersonation_logs (target_org_id, impersonated_at DESC);

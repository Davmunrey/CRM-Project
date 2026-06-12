-- Help desk / support tickets (HubSpot Service / Zoho Desk-style). Linked to a
-- contact and/or company, assignable, status + priority. Org-scoped; RLS as opt-in
-- defense-in-depth (app-layer scoping is authoritative — see docs/adr/0001).
CREATE TABLE IF NOT EXISTS tickets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject         text        NOT NULL,
  description     text        NOT NULL DEFAULT '',
  status          text        NOT NULL DEFAULT 'open'    CHECK (status IN ('open','pending','resolved','closed')),
  priority        text        NOT NULL DEFAULT 'medium'  CHECK (priority IN ('low','medium','high','urgent')),
  contact_id      uuid        REFERENCES contacts(id)  ON DELETE SET NULL,
  company_id      uuid        REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to     uuid        REFERENCES users(id)     ON DELETE SET NULL,
  created_by      uuid        REFERENCES users(id)     ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tickets_org_status ON tickets (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_org_assignee ON tickets (organization_id, assigned_to);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tickets_org ON tickets;
CREATE POLICY rls_tickets_org ON tickets
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

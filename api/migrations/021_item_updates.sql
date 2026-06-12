-- Monday-style collaboration: threaded "Updates" on CRM items (contacts, companies,
-- deals, leads). Each update can be a reply (parent_id) and can @mention org members.
-- App-layer org scoping is the authoritative control; RLS mirrors the 018_ai pattern
-- as opt-in defense-in-depth (see docs/adr/0001-tenant-isolation-and-rls.md).

CREATE TABLE IF NOT EXISTS item_updates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type     text        NOT NULL CHECK (entity_type IN ('contact','company','deal','lead')),
  entity_id       text        NOT NULL,
  parent_id       uuid        REFERENCES item_updates(id) ON DELETE CASCADE,
  author_id       uuid        REFERENCES users(id) ON DELETE SET NULL,
  body            text        NOT NULL,
  mentions        jsonb       NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_item_updates_entity
  ON item_updates (organization_id, entity_type, entity_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_updates_parent
  ON item_updates (parent_id) WHERE parent_id IS NOT NULL;

-- ── RLS (opt-in defense-in-depth) ────────────────────────────────────────────
ALTER TABLE item_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_item_updates_org ON item_updates;
CREATE POLICY rls_item_updates_org ON item_updates
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

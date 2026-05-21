-- Per-thread workspace metadata (owner assignment + internal notes)
CREATE TABLE IF NOT EXISTS gmail_thread_workspace (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       text NOT NULL,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  internal_note   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_gmail_thread_workspace_org_user
  ON gmail_thread_workspace (organization_id, user_id);

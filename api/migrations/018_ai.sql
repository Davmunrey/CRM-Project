-- ─────────────────────────────────────────────────────────────────────────────
-- 018_ai.sql — AI / agentic assistant
--
-- Three org-scoped tables:
--   ai_conversations  one assistant thread per (org,user)
--   ai_messages       turns within a conversation (user/assistant/tool)
--   ai_usage_log      per-call token accounting for cost/limit visibility
--
-- RLS mirrors migration 002 (ENABLE + org-isolation policy keyed on the
-- app.current_org_id GUC set by set_current_org). The table-owner role bypasses
-- RLS, so app-layer `organization_id = $org` filtering remains the primary
-- enforcement; RLS is defense-in-depth for non-owner roles.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid        REFERENCES users(id) ON DELETE SET NULL,
  title           text        NOT NULL DEFAULT 'New conversation',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content         text        NOT NULL DEFAULT '',
  -- Tool calls requested by an assistant turn / executed tool steps, for replay + UI.
  steps           jsonb       NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid        REFERENCES users(id) ON DELETE SET NULL,
  provider        text        NOT NULL,
  model           text        NOT NULL,
  action          text        NOT NULL,
  input_tokens    integer     NOT NULL DEFAULT 0,
  output_tokens   integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_org_user
  ON ai_conversations (organization_id, user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON ai_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_org_created
  ON ai_usage_log (organization_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_ai_conversations_org ON ai_conversations;
CREATE POLICY rls_ai_conversations_org ON ai_conversations
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_ai_messages_org ON ai_messages;
CREATE POLICY rls_ai_messages_org ON ai_messages
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_ai_usage_log_org ON ai_usage_log;
CREATE POLICY rls_ai_usage_log_org ON ai_usage_log
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

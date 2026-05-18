-- Migration 008: Multi-pipeline support
-- Each org can have multiple named pipelines with their own stages.
-- deals.pipeline_id links each deal to a pipeline.

-- ─── Pipelines ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipelines (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text,
  is_default      boolean     NOT NULL DEFAULT false,
  is_archived     boolean     NOT NULL DEFAULT false,
  -- Ordered array of stage objects: [{id,name,color,order,probability}]
  stages          jsonb       NOT NULL DEFAULT '[]',
  view_access     text        NOT NULL DEFAULT 'all'
                              CHECK (view_access IN ('all', 'members_only')),
  created_by      uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Only one default pipeline per org (enforced at app layer + this partial index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipelines_org_default
  ON pipelines (organization_id)
  WHERE is_default = true AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_pipelines_org ON pipelines(organization_id);

-- ─── Pipeline Members ─────────────────────────────────────────────────────────
-- Controls who can access members_only pipelines.
-- admin/owner always have implicit access regardless of membership.
CREATE TABLE IF NOT EXISTS pipeline_members (
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member'
              CHECK (role IN ('owner', 'member')),
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pipeline_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_members_user ON pipeline_members(user_id);

-- ─── Deals: add pipeline_id ──────────────────────────────────────────────────
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS pipeline_id uuid REFERENCES pipelines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON deals(pipeline_id);

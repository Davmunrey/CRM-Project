-- Sprint 2: Server-side sync for local-first stores
-- Adds tables for smart_views, distribution_lists, and user_preferences

-- Smart views (per-org, synced from viewsStore)
CREATE TABLE IF NOT EXISTS smart_views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'deal')),
  name          TEXT NOT NULL,
  name_key      TEXT,
  filters       JSONB NOT NULL DEFAULT '[]',
  sort_field    TEXT,
  sort_direction TEXT CHECK (sort_direction IN ('asc','desc')),
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS smart_views_org_entity ON smart_views (organization_id, entity_type);

-- Inbox saved views (per-org)
CREATE TABLE IF NOT EXISTS inbox_views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  query         TEXT NOT NULL DEFAULT '',
  filters       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS inbox_views_org ON inbox_views (organization_id);

-- Distribution lists (per-org)
CREATE TABLE IF NOT EXISTS distribution_lists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('contact', 'company')),
  member_ids    UUID[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS distribution_lists_org ON distribution_lists (organization_id);

-- User preferences: navigation prefs + onboarding flags (per-user)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  navigation     JSONB NOT NULL DEFAULT '{}',
  onboarding     JSONB NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

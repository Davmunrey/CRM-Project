-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002 — Indexes, performance fixes, and Row Level Security
-- Apply with: psql $DATABASE_URL -f migrations/002_indexes_and_perf.sql
--
-- All indexes use CONCURRENTLY so they can be built on a live database without
-- acquiring an AccessShareLock that would block reads or writes.
-- CONCURRENTLY cannot run inside an explicit transaction block; run this file
-- outside of BEGIN/COMMIT or use psql directly.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. pg_trgm extension ────────────────────────────────────────────────────
-- Required for GIN trigram indexes that make ILIKE fast.
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ─── 2. GIN trigram indexes for ILIKE search columns ─────────────────────────

-- contacts: first_name, last_name, email, phone
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_contacts_first_name
  ON contacts USING GIN (first_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_contacts_last_name
  ON contacts USING GIN (last_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_contacts_email
  ON contacts USING GIN (email gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_contacts_phone
  ON contacts USING GIN (phone gin_trgm_ops);

-- companies: name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_companies_name
  ON companies USING GIN (name gin_trgm_ops);

-- deals: title
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_deals_title
  ON deals USING GIN (title gin_trgm_ops);

-- leads: first_name, last_name, email (leads list is a hot search path too)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_leads_first_name
  ON leads USING GIN (first_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_leads_last_name
  ON leads USING GIN (last_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_leads_email
  ON leads USING GIN (email gin_trgm_ops);


-- ─── 3. B-tree covering indexes on hot tenant-scoped foreign keys ─────────────
-- Pattern: WHERE organization_id = $1 AND <fk> = $2
-- 001_schema.sql already covers the most basic (org, email) and (org) cases;
-- the entries below fill in everything that was missed.

-- contacts.assigned_to scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_org_assigned
  ON contacts(organization_id, assigned_to);

-- contacts.company_id scoped to org (001 has idx_contacts_company without org)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_org_company
  ON contacts(organization_id, company_id);

-- deals.contact_id scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_org_contact
  ON deals(organization_id, contact_id);

-- deals.company_id scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_org_company
  ON deals(organization_id, company_id);

-- deals.owner_id scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_org_owner
  ON deals(organization_id, owner_id);

-- deals.assigned_to scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_org_assigned
  ON deals(organization_id, assigned_to);

-- activities.company_id scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_org_company
  ON activities(organization_id, company_id);

-- activities.contact_id scoped to org (001 has idx_activities_contact without org)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_org_contact
  ON activities(organization_id, contact_id);

-- activities.deal_id scoped to org (001 has idx_activities_deal without org)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_org_deal
  ON activities(organization_id, deal_id);

-- sequence_enrollments.sequence_id scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seq_enr_org_sequence
  ON sequence_enrollments(organization_id, sequence_id);

-- sequence_enrollments.contact_id scoped to org (001 has it without org)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seq_enr_org_contact
  ON sequence_enrollments(organization_id, contact_id);

-- leads.assigned_to scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_assigned
  ON leads(organization_id, assigned_to);

-- leads.owner_user_id scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_owner
  ON leads(organization_id, owner_user_id);

-- lead_events.organization_id (scan by org before filtering by lead)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_events_org
  ON lead_events(organization_id, lead_id, created_at DESC);

-- quick_replies.user_id scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quick_replies_org_user
  ON quick_replies(organization_id, user_id);

-- sales_goals.user_id scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_goals_org_user
  ON sales_goals(organization_id, user_id);

-- automation_executions.rule_id scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auto_exec_org_rule
  ON automation_executions(organization_id, rule_id);

-- custom_field_values.field_id scoped to org
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cfv_org_field
  ON custom_field_values(organization_id, field_id);

-- notifications: unread lookup (hot path for notification badge)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread
  ON notifications(organization_id, user_id, is_read)
  WHERE is_read = false;


-- ─── 4. Composite indexes for common list query patterns ─────────────────────

-- (organization_id, created_at DESC) — default sort on all list endpoints
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_org_created
  ON contacts(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_org_created
  ON deals(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_org_created
  ON companies(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_org_created
  ON activities(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_created
  ON leads(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sequences_org_created
  ON email_sequences(organization_id, created_at DESC);

-- (organization_id, status) — filtered list views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_org_status
  ON deals(organization_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_org_status
  ON contacts(organization_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_status
  ON leads(organization_id, status);

-- (organization_id, assigned_to) — "my items" filter used on every list view
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_org_assigned_to
  ON deals(organization_id, assigned_to);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_org_assigned_to
  ON contacts(organization_id, assigned_to);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_org_assigned_to
  ON leads(organization_id, assigned_to);


-- ─── 5. Partial index for active email sequences ──────────────────────────────
-- email_sequences uses is_active boolean (not a status text column).
-- This index covers the common "fetch active sequences" query and is kept small
-- because inactive sequences are excluded from the index entirely.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sequences_active
  ON email_sequences(organization_id, created_at DESC)
  WHERE is_active = true;

-- Active sequence enrollments — polled by the sequence runner on every tick
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seq_enr_active_next_step
  ON sequence_enrollments(organization_id, next_step_at ASC)
  WHERE status = 'active';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
-- The API sets the GUC app.current_org_id at the start of every request via
-- the set_current_org() function below. All subsequent queries in that
-- connection/transaction are automatically filtered to that org's rows.
--
-- IMPORTANT: Every DB role used by the API must have RLS bypassed OR the
-- function below must be called before any query. The app role should NOT be
-- a superuser; superusers bypass RLS by default.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper function — call once per request: SELECT set_current_org('<uuid>');
CREATE OR REPLACE FUNCTION set_current_org(org_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER   -- runs as the function owner, not the caller
  SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_org_id', org_id::text, true);
  -- true = local to current transaction; false = session-scoped.
  -- Use false if your connection pool uses session-level settings.
END;
$$;

-- Convenience overload accepting text so callers don't need an explicit cast
CREATE OR REPLACE FUNCTION set_current_org(org_id text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  PERFORM set_current_org(org_id::uuid);
END;
$$;

-- ── RLS policies ─────────────────────────────────────────────────────────────
-- Pattern for every table:
--   1. Enable RLS (idempotent after first run)
--   2. Drop old policy if it exists so re-running this migration is safe
--   3. Create the org-isolation policy

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_users_org ON users;
CREATE POLICY rls_users_org ON users
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_invitations_org ON invitations;
CREATE POLICY rls_invitations_org ON invitations
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_companies_org ON companies;
CREATE POLICY rls_companies_org ON companies
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_contacts_org ON contacts;
CREATE POLICY rls_contacts_org ON contacts
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- deals
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_deals_org ON deals;
CREATE POLICY rls_deals_org ON deals
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_activities_org ON activities;
CREATE POLICY rls_activities_org ON activities
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_notifications_org ON notifications;
CREATE POLICY rls_notifications_org ON notifications
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_audit_log_org ON audit_log;
CREATE POLICY rls_audit_log_org ON audit_log
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_products_org ON products;
CREATE POLICY rls_products_org ON products
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_email_templates_org ON email_templates;
CREATE POLICY rls_email_templates_org ON email_templates
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- quick_replies
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_quick_replies_org ON quick_replies;
CREATE POLICY rls_quick_replies_org ON quick_replies
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- sales_goals
ALTER TABLE sales_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_sales_goals_org ON sales_goals;
CREATE POLICY rls_sales_goals_org ON sales_goals
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- automation_rules
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_automation_rules_org ON automation_rules;
CREATE POLICY rls_automation_rules_org ON automation_rules
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- automation_executions
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_automation_executions_org ON automation_executions;
CREATE POLICY rls_automation_executions_org ON automation_executions
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- email_sequences
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_email_sequences_org ON email_sequences;
CREATE POLICY rls_email_sequences_org ON email_sequences
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- sequence_enrollments
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_sequence_enrollments_org ON sequence_enrollments;
CREATE POLICY rls_sequence_enrollments_org ON sequence_enrollments
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- custom_field_definitions
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_custom_field_definitions_org ON custom_field_definitions;
CREATE POLICY rls_custom_field_definitions_org ON custom_field_definitions
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- custom_field_values
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_custom_field_values_org ON custom_field_values;
CREATE POLICY rls_custom_field_values_org ON custom_field_values
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- custom_field_definition_i18n
ALTER TABLE custom_field_definition_i18n ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_custom_field_definition_i18n_org ON custom_field_definition_i18n;
CREATE POLICY rls_custom_field_definition_i18n_org ON custom_field_definition_i18n
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_leads_org ON leads;
CREATE POLICY rls_leads_org ON leads
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- lead_events
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_lead_events_org ON lead_events;
CREATE POLICY rls_lead_events_org ON lead_events
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- lead_score_snapshots
ALTER TABLE lead_score_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_lead_score_snapshots_org ON lead_score_snapshots;
CREATE POLICY rls_lead_score_snapshots_org ON lead_score_snapshots
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- lead_scoring_rules
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_lead_scoring_rules_org ON lead_scoring_rules;
CREATE POLICY rls_lead_scoring_rules_org ON lead_scoring_rules
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

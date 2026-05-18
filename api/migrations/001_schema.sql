-- Velo CRM — Standalone PostgreSQL Schema
-- No Supabase dependencies. All auth handled by velo-api JWT.
-- Run via: npm run db:migrate

-- ─── Organizations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  domain      text,
  logo_url    text,
  plan        text        NOT NULL DEFAULT 'free',
  settings    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text        NOT NULL UNIQUE,
  password_hash   text        NOT NULL,
  name            text        NOT NULL,
  role            text        NOT NULL DEFAULT 'sales_rep'
                              CHECK (role IN ('owner','admin','manager','sales_rep','viewer')),
  job_title       text,
  avatar_url      text,
  is_active       boolean     NOT NULL DEFAULT true,
  organization_id uuid        REFERENCES organizations(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Invitations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           text        NOT NULL,
  role            text        NOT NULL DEFAULT 'sales_rep',
  token           text        NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by      uuid        REFERENCES users(id) ON DELETE SET NULL,
  status          text        NOT NULL DEFAULT 'pending',
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email, organization_id)
);

-- ─── Companies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  domain          text,
  industry        text,
  size            text,
  country         text,
  city            text,
  website         text,
  phone           text,
  revenue         numeric,
  status          text        NOT NULL DEFAULT 'prospect',
  tags            text[]      NOT NULL DEFAULT '{}',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_org ON companies(organization_id);

-- ─── Contacts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name       text        NOT NULL,
  last_name        text        NOT NULL DEFAULT '',
  email            text,
  phone            text,
  job_title        text,
  company_id       uuid        REFERENCES companies(id) ON DELETE SET NULL,
  status           text        NOT NULL DEFAULT 'prospect',
  type             text        NOT NULL DEFAULT 'lead' CHECK (type IN ('lead','contact')),
  source           text        NOT NULL DEFAULT 'other',
  lead_score       integer     NOT NULL DEFAULT 50,
  tags             text[]      NOT NULL DEFAULT '{}',
  notes            text,
  assigned_to      uuid        REFERENCES users(id) ON DELETE SET NULL,
  last_contacted_at timestamptz,
  linked_deals     text[]      NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(organization_id, email);

-- ─── Deals ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title               text        NOT NULL,
  value               numeric     NOT NULL DEFAULT 0,
  currency            text        NOT NULL DEFAULT 'USD',
  stage               text        NOT NULL DEFAULT 'lead',
  status              text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost')),
  contact_id          uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  company_id          uuid        REFERENCES companies(id) ON DELETE SET NULL,
  owner_id            uuid        REFERENCES users(id) ON DELETE SET NULL,
  assigned_to         uuid        REFERENCES users(id) ON DELETE SET NULL,
  expected_close_date date,
  closed_at           timestamptz,
  quote_items         jsonb       NOT NULL DEFAULT '[]',
  tags                text[]      NOT NULL DEFAULT '{}',
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_org ON deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(organization_id, stage);

-- ─── Activities ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type            text        NOT NULL CHECK (type IN ('call','email','meeting','task','note','demo','follow_up')),
  subject         text        NOT NULL,
  description     text        NOT NULL DEFAULT '',
  outcome         text,
  due_date        timestamptz,
  completed_at    timestamptz,
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  contact_id      uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      uuid        REFERENCES companies(id) ON DELETE SET NULL,
  deal_id         uuid        REFERENCES deals(id) ON DELETE SET NULL,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_org ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);

-- ─── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type            text        NOT NULL,
  title           text        NOT NULL,
  message         text        NOT NULL DEFAULT '',
  entity_type     text,
  entity_id       text,
  user_id         text        NOT NULL DEFAULT 'system',
  triggered_by    text,
  is_read         boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_org_user ON notifications(organization_id, user_id);

-- ─── Audit Log ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action          text        NOT NULL,
  entity_type     text        NOT NULL,
  entity_id       text        NOT NULL,
  entity_name     text        NOT NULL DEFAULT '',
  details         text        NOT NULL DEFAULT '',
  user_id         text        NOT NULL DEFAULT 'system',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(organization_id, created_at DESC);

-- ─── Products ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text,
  sku             text,
  price           numeric     NOT NULL DEFAULT 0,
  currency        text        NOT NULL DEFAULT 'EUR',
  category        text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Email Templates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  subject         text        NOT NULL,
  body            text        NOT NULL DEFAULT '',
  category        text        NOT NULL DEFAULT 'general'
                              CHECK (category IN ('outreach','follow_up','proposal','onboarding','general')),
  variables       text[]      NOT NULL DEFAULT '{}',
  usage_count     integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Quick Replies ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quick_replies (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid        REFERENCES users(id) ON DELETE SET NULL,
  title           text        NOT NULL,
  body            text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Sales Goals ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_goals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid        REFERENCES users(id) ON DELETE SET NULL,
  type            text        NOT NULL,
  target          numeric     NOT NULL DEFAULT 0,
  current         numeric     NOT NULL DEFAULT 0,
  period          text        NOT NULL DEFAULT 'monthly',
  start_date      date        NOT NULL,
  end_date        date        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Automation Rules ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text        NOT NULL DEFAULT '',
  is_active       boolean     NOT NULL DEFAULT true,
  trigger         jsonb       NOT NULL DEFAULT '{}',
  actions         jsonb       NOT NULL DEFAULT '[]',
  execution_count integer     NOT NULL DEFAULT 0,
  last_executed_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Automation Executions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_executions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id         uuid        REFERENCES automation_rules(id) ON DELETE SET NULL,
  trigger_type    text        NOT NULL,
  status          text        NOT NULL DEFAULT 'success' CHECK (status IN ('success','error')),
  context         jsonb       NOT NULL DEFAULT '{}',
  result          jsonb       NOT NULL DEFAULT '{}',
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_exec_org ON automation_executions(organization_id, created_at DESC);

-- ─── Email Sequences ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sequences (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                        text        NOT NULL,
  description                 text        NOT NULL DEFAULT '',
  steps                       jsonb       NOT NULL DEFAULT '[]',
  flow_definition             jsonb,
  created_by                  uuid        REFERENCES users(id) ON DELETE SET NULL,
  is_active                   boolean     NOT NULL DEFAULT true,
  enrolled_count              integer     NOT NULL DEFAULT 0,
  stop_on_contact_reply       boolean     NOT NULL DEFAULT true,
  enrollment_start_delay_days integer     NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- ─── Sequence Enrollments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sequence_id         uuid        NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  contact_id          uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name        text        NOT NULL,
  current_step        integer     NOT NULL DEFAULT 0,
  current_node_id     text,
  ab_variant          text        CHECK (ab_variant IN ('a','b')),
  status              text        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','paused','completed','unenrolled','replied')),
  enrolled_at         timestamptz NOT NULL DEFAULT now(),
  next_step_at        timestamptz,
  completed_at        timestamptz,
  last_sent_thread_id text,
  last_sent_message_id text
);

CREATE INDEX IF NOT EXISTS idx_seq_enr_org ON sequence_enrollments(organization_id);
CREATE INDEX IF NOT EXISTS idx_seq_enr_contact ON sequence_enrollments(contact_id);

-- ─── Custom Field Definitions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type     text        NOT NULL,
  label           text        NOT NULL,
  field_type      text        NOT NULL DEFAULT 'text',
  placeholder     text,
  options         jsonb,
  required        boolean     NOT NULL DEFAULT false,
  "order"         integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Custom Field Values ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_field_values (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id       text        NOT NULL,
  field_id        uuid        NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value           jsonb,
  UNIQUE(entity_id, field_id)
);

-- ─── Custom Field i18n ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_field_definition_i18n (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field_id        uuid        NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  language_code   text        NOT NULL,
  label           text        NOT NULL,
  placeholder     text,
  options         jsonb,
  UNIQUE(field_id, language_code)
);

-- ─── Leads ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name           text        NOT NULL,
  last_name            text        NOT NULL,
  email                text        NOT NULL,
  phone                text,
  company_name         text,
  job_title            text,
  source               text        NOT NULL DEFAULT 'website',
  status               text        NOT NULL DEFAULT 'open'
                                   CHECK (status IN ('open','contacted','qualified','disqualified','converted')),
  lifecycle_stage      text        NOT NULL DEFAULT 'lead'
                                   CHECK (lifecycle_stage IN ('lead','mql','sql','opportunity','customer','evangelist')),
  score                integer     NOT NULL DEFAULT 0,
  assigned_to          uuid        REFERENCES users(id) ON DELETE SET NULL,
  owner_user_id        uuid        REFERENCES users(id) ON DELETE SET NULL,
  tags                 jsonb       NOT NULL DEFAULT '[]',
  notes                text,
  last_engaged_at      timestamptz,
  converted_contact_id uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  converted_company_id uuid        REFERENCES companies(id) ON DELETE SET NULL,
  converted_deal_id    uuid        REFERENCES deals(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_unique_email_per_org ON leads(organization_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id, score DESC);

-- ─── Lead Events ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id         uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type      text        NOT NULL,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id, created_at DESC);

-- ─── Lead Score Snapshots ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_score_snapshots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id         uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  score           integer     NOT NULL,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_snapshots_lead ON lead_score_snapshots(lead_id, created_at ASC);

-- ─── Lead Scoring Rules ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key             text        NOT NULL,
  points          integer     NOT NULL DEFAULT 0,
  is_enabled      boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, key)
);

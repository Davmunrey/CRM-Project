-- Soft-delete columns for core CRM entities (Velo plan: DSR + retention path).
-- SELECT RLS: hide rows where deleted_at IS NOT NULL.

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contacts_org_active ON public.contacts (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_org_active ON public.companies (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deals_org_active ON public.deals (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activities_org_active ON public.activities (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_org_active ON public.leads (organization_id) WHERE deleted_at IS NULL;

DROP POLICY IF EXISTS "org_members_can_read_contacts" ON public.contacts;
CREATE POLICY "org_members_can_read_contacts" ON public.contacts
  FOR SELECT USING (organization_id = public.get_org_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "org_members_can_read_companies" ON public.companies;
CREATE POLICY "org_members_can_read_companies" ON public.companies
  FOR SELECT USING (organization_id = public.get_org_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "org_members_can_read_deals" ON public.deals;
CREATE POLICY "org_members_can_read_deals" ON public.deals
  FOR SELECT USING (organization_id = public.get_org_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "org_members_can_read_activities" ON public.activities;
CREATE POLICY "org_members_can_read_activities" ON public.activities
  FOR SELECT USING (organization_id = public.get_org_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "org_read_leads" ON public.leads;
CREATE POLICY "org_read_leads" ON public.leads
  FOR SELECT USING (organization_id = public.get_org_id() AND deleted_at IS NULL);

COMMENT ON COLUMN public.contacts.deleted_at IS 'Soft delete timestamp; null = active.';
COMMENT ON COLUMN public.companies.deleted_at IS 'Soft delete timestamp; null = active.';
COMMENT ON COLUMN public.deals.deleted_at IS 'Soft delete timestamp; null = active.';
COMMENT ON COLUMN public.activities.deleted_at IS 'Soft delete timestamp; null = active.';
COMMENT ON COLUMN public.leads.deleted_at IS 'Soft delete timestamp; null = active.';

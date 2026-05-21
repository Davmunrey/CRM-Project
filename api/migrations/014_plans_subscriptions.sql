-- Plans and subscriptions for multi-tenant billing management

CREATE TABLE IF NOT EXISTS plans (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        NOT NULL UNIQUE,
  description     text,
  price_monthly   numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly    numeric(10,2) NOT NULL DEFAULT 0,
  currency        varchar(3)  NOT NULL DEFAULT 'EUR',
  max_users       integer     NOT NULL DEFAULT 5,
  max_contacts    integer     NOT NULL DEFAULT 1000,
  max_deals       integer     NOT NULL DEFAULT 500,
  max_pipelines   integer     NOT NULL DEFAULT 1,
  features        jsonb       NOT NULL DEFAULT '{}',
  is_active       boolean     NOT NULL DEFAULT true,
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                 uuid        NOT NULL REFERENCES plans(id),
  status                  text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  trial_ends_at           timestamptz,
  current_period_start    timestamptz NOT NULL DEFAULT now(),
  current_period_end      timestamptz,
  stripe_subscription_id  text,
  stripe_customer_id      text,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);

-- Seed default plans
INSERT INTO plans (name, slug, description, price_monthly, price_yearly, max_users, max_contacts, max_deals, max_pipelines, features, sort_order)
VALUES
  ('Free',       'free',       'For individuals and small teams getting started',        0,    0,    3,    500,    200,  1, '{"gmail":false,"calendar":false,"api":false,"webhooks":false}', 0),
  ('Pro',        'pro',        'For growing sales teams with advanced features',         49,   490,  15,   10000,  5000, 5, '{"gmail":true,"calendar":true,"api":true,"webhooks":true}',    1),
  ('Enterprise', 'enterprise', 'Unlimited usage with priority support and custom setup', 199,  1990, 100,  999999, 999999, 99, '{"gmail":true,"calendar":true,"api":true,"webhooks":true,"sso":true,"custom_domain":true}', 2)
ON CONFLICT (slug) DO NOTHING;

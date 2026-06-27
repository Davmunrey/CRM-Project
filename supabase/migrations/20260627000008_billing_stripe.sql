-- Propel — Billing: map plans to Stripe products/prices and index subscriptions.
--
-- subscriptions already carries stripe_customer_id + stripe_subscription_id.
-- This adds the Stripe identifiers on the plans catalog so checkout can resolve
-- a plan + billing interval to a Stripe Price, and indexes the lookups the
-- webhook performs (by org and by stripe subscription id).

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS stripe_product_id      text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_yearly  text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- One subscription row per org (the webhook + checkout upsert on this).
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_org_unique
  ON public.subscriptions (organization_id);

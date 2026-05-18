-- OAuth state: which scope bundle was requested (primary Gmail vs incremental Calendar).
ALTER TABLE public.google_oauth_states
  ADD COLUMN IF NOT EXISTS bundle text NOT NULL DEFAULT 'primary';

COMMENT ON COLUMN public.google_oauth_states.bundle IS 'primary = identity + Gmail; calendar = incremental Calendar scopes only.';

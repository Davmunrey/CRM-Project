-- OAuth PKCE state for server-side Google connect (Velo user already signed in with Supabase).
-- Service role only at runtime; RLS enabled with no user policies = client cannot read.

CREATE TABLE IF NOT EXISTS public.google_oauth_states (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state         text        NOT NULL,
  code_verifier text        NOT NULL,
  redirect_uri  text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_oauth_states_state
  ON public.google_oauth_states (state);

CREATE INDEX IF NOT EXISTS idx_google_oauth_states_expires
  ON public.google_oauth_states (expires_at);

ALTER TABLE public.google_oauth_states ENABLE ROW LEVEL SECURITY;

-- Encrypted + extended Google (Gmail + Calendar) connection fields on existing table
ALTER TABLE public.gmail_tokens
  ADD COLUMN IF NOT EXISTS google_sub text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS refresh_token_cipher text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_sync_token text,
  ADD COLUMN IF NOT EXISTS gmail_history_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Allow server-only storage: plaintext refresh optional when cipher is set
ALTER TABLE public.gmail_tokens
  ALTER COLUMN refresh_token DROP NOT NULL;

COMMENT ON COLUMN public.gmail_tokens.refresh_token_cipher IS 'AES-256-GCM encrypted refresh token; preferred over refresh_token when set.';

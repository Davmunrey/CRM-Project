-- ─────────────────────────────────────────────────────────────────────────────
-- 019_mfa.sql — TOTP multi-factor authentication
--
-- mfa_secret_cipher holds the base32 TOTP secret encrypted with AES-256-GCM
-- (services/tokenCipher.ts), so a DB compromise alone does not expose seeds.
-- mfa_enabled is only set true after the user proves possession with a valid
-- code (POST /auth/mfa/enable).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret_cipher text;

-- One-off bootstrap: promote david@clovrlabs.com to platform super-admin.
-- Recorded in _migrations after first run so it never re-applies.
-- Idempotent by design — the UPDATE is a no-op if the flag is already true,
-- and a no-op if the user does not exist yet (no rows match).

DO $$
DECLARE
  affected INT;
BEGIN
  UPDATE users
     SET is_super_admin = true
   WHERE email = 'david@clovrlabs.com';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE '[017] promoted % row(s) to super_admin (target: david@clovrlabs.com)', affected;
END
$$;

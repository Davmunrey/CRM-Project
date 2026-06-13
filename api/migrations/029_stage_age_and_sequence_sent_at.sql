-- 029: support two audit-fix features.
--
-- (B1-24) deals.stage_changed_at — "days in stage" was computed from updated_at,
-- so any unrelated edit reset the counter. Track when the stage last changed.
ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz NOT NULL DEFAULT now();
-- Seed existing rows from updated_at (closest signal we have) instead of the
-- migration-time default, so current cards don't all reset to "0 days in stage".
UPDATE deals SET stage_changed_at = COALESCE(updated_at, created_at, now());

-- (B1-16) sequence_enrollments.last_sent_at — reply detection keyed off a Gmail
-- last_sent_thread_id that the SMTP send path never wrote, so "stop on contact
-- reply" never fired. Record the time of the last step send so reply detection
-- can match any inbound message from the contact after it (transport-independent).
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

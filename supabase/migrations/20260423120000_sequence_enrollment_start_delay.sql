-- Days to wait after enrollment before the first step clock starts (in addition to the first node's delayDays).

ALTER TABLE public.email_sequences
  ADD COLUMN IF NOT EXISTS enrollment_start_delay_days integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.email_sequences.enrollment_start_delay_days IS
  'Calendar days after enroll_at before first-step scheduling; combined client-side with first node delayDays until worker exists.';

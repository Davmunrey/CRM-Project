-- DLQ-style terminal state for webhook deliveries (max retries exhausted).
ALTER TABLE public.webhook_outbox DROP CONSTRAINT IF EXISTS webhook_outbox_status_check;
ALTER TABLE public.webhook_outbox
  ADD CONSTRAINT webhook_outbox_status_check
  CHECK (status IN ('pending', 'delivered', 'failed', 'dead'));

COMMENT ON COLUMN public.webhook_outbox.status IS 'pending | delivered | failed (retryable) | dead (DLQ, no more retries)';

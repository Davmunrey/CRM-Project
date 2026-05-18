-- Sequence behavior: stop when contact replies; worker stores last Gmail ids for reply-in-thread sends.

ALTER TABLE public.email_sequences
  ADD COLUMN IF NOT EXISTS stop_on_contact_reply boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.email_sequences.stop_on_contact_reply IS
  'When true, inbound reply from the enrolled contact should set enrollment status to replied and cancel further automated steps; follow-up continues in mailbox.';

ALTER TABLE public.sequence_enrollments
  ADD COLUMN IF NOT EXISTS last_sent_thread_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_sent_message_id text DEFAULT NULL;

COMMENT ON COLUMN public.sequence_enrollments.last_sent_thread_id IS
  'Gmail thread id of the last outbound sequence email for this enrollment; used when next step uses reply_in_thread mode.';
COMMENT ON COLUMN public.sequence_enrollments.last_sent_message_id IS
  'Gmail message id of the last outbound sequence email; used for In-Reply-To / References when replying in thread.';

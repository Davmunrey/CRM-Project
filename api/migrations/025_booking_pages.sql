-- Meeting scheduler / booking links (HubSpot Meetings-style). An owner publishes a
-- booking page with weekly availability; a public visitor books a slot at /book/:token.
-- A booking creates a local calendar_events row + an activity (+ optional lead).
-- (Live Google Calendar push for bookings is a follow-up; availability is computed
-- against existing confirmed bookings for v1.)
CREATE TABLE IF NOT EXISTS booking_pages (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id            uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug               text        NOT NULL,
  token_hash         text        NOT NULL UNIQUE,
  token_prefix       text        NOT NULL,
  title              text        NOT NULL DEFAULT 'Book a meeting',
  description        text        NOT NULL DEFAULT '',
  duration_minutes   integer     NOT NULL DEFAULT 30,
  timezone           text        NOT NULL DEFAULT 'UTC',
  availability       jsonb       NOT NULL DEFAULT '[]',  -- [{ dow:0-6 (Sun=0), start:'HH:MM', end:'HH:MM' }]
  min_notice_minutes integer     NOT NULL DEFAULT 240,
  max_days_ahead     integer     NOT NULL DEFAULT 60,
  create_lead        boolean     NOT NULL DEFAULT true,
  enabled            boolean     NOT NULL DEFAULT true,
  booking_count      integer     NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_booking_pages_owner ON booking_pages (user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_booking_pages_token ON booking_pages (token_hash) WHERE enabled = true;

CREATE TABLE IF NOT EXISTS bookings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_page_id   uuid        NOT NULL REFERENCES booking_pages(id) ON DELETE CASCADE,
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  start_at          timestamptz NOT NULL,
  end_at            timestamptz NOT NULL,
  invitee_name      text        NOT NULL DEFAULT '',
  invitee_email     text        NOT NULL,
  invitee_notes     text,
  status            text        NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  calendar_event_id uuid        REFERENCES calendar_events(id) ON DELETE SET NULL,
  contact_id        uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  activity_id       uuid        REFERENCES activities(id) ON DELETE SET NULL,
  cancel_token      text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_page_start ON bookings (booking_page_id, start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_org ON bookings (organization_id);
-- Hard guard against double-booking the same slot on a page.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_slot ON bookings (booking_page_id, start_at) WHERE status = 'confirmed';

ALTER TABLE booking_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_booking_pages_org ON booking_pages;
CREATE POLICY rls_booking_pages_org ON booking_pages USING (organization_id = current_setting('app.current_org_id', true)::uuid);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_bookings_org ON bookings;
CREATE POLICY rls_bookings_org ON bookings USING (organization_id = current_setting('app.current_org_id', true)::uuid);

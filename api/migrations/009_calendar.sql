-- Migration 009: Google Calendar sync — events + push-notification channels

-- ─── Calendar events (synced from Google Calendar) ───────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_event_id   text        NOT NULL,
  google_calendar_id text       NOT NULL DEFAULT 'primary',
  title             text        NOT NULL DEFAULT '',
  description       text,
  location          text,
  start_at          timestamptz NOT NULL,
  end_at            timestamptz NOT NULL,
  all_day           boolean     NOT NULL DEFAULT false,
  status            text        NOT NULL DEFAULT 'confirmed'
                                CHECK (status IN ('confirmed','tentative','cancelled')),
  html_link         text,
  meet_link         text,
  organizer_email   text,
  attendees         jsonb       NOT NULL DEFAULT '[]',
  recurrence        text[],
  contact_id        uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  company_id        uuid        REFERENCES companies(id) ON DELETE SET NULL,
  deal_id           uuid        REFERENCES deals(id) ON DELETE SET NULL,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, google_event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_org_user_start
  ON calendar_events(organization_id, user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id
  ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_contact
  ON calendar_events(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_deal
  ON calendar_events(deal_id) WHERE deal_id IS NOT NULL;

-- ─── Google Calendar watch channels (push notification subscriptions) ─────────
CREATE TABLE IF NOT EXISTS calendar_watch_channels (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id        text        NOT NULL UNIQUE,
  resource_id       text,
  calendar_id       text        NOT NULL DEFAULT 'primary',
  expiration        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_watch_org
  ON calendar_watch_channels(organization_id);

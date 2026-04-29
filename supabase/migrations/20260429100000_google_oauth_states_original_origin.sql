-- Add original_origin to google_oauth_states for cross-origin OAuth redirect support
ALTER TABLE google_oauth_states
  ADD COLUMN IF NOT EXISTS original_origin text;

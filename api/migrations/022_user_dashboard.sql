-- Monday-style composable dashboard: per-user saved widget layout (array of
-- { id, type, title, config }). Stored on the existing user_preferences row.
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS dashboard JSONB NOT NULL DEFAULT '{}';

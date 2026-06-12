-- Web-to-lead form builder: store the form definition (title/fields/success) on the
-- existing lead-capture token, and count submissions. The token (lct_) is the
-- public credential embedded in the form; submissions hit /public/forms/:token.
ALTER TABLE lead_capture_tokens ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE lead_capture_tokens ADD COLUMN IF NOT EXISTS submission_count INTEGER NOT NULL DEFAULT 0;

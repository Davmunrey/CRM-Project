CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id    uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token      text        NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

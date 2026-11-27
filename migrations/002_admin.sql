-- Admin accounts and sessions. Passwords are scrypt hashes; session ids are stored as SHA-256 hashes.
CREATE TABLE admin_users (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_users_email_key ON admin_users (lower(email));

CREATE TABLE admin_sessions (
  token_hash text PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX admin_sessions_expires_idx ON admin_sessions (expires_at);

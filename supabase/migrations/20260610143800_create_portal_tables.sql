CREATE TABLE space_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES client_spaces(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES client_recipients(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_space_access_tokens_space_recipient ON space_access_tokens(space_id, recipient_id);
CREATE INDEX idx_space_access_tokens_hash ON space_access_tokens(token_hash);

ALTER TABLE space_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES client_spaces(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES client_recipients(id) ON DELETE CASCADE,
  session_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz
);

CREATE INDEX idx_portal_sessions_hash ON portal_sessions(session_token_hash);
CREATE INDEX idx_portal_sessions_space_expires ON portal_sessions(space_id, expires_at);

ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;

-- Migration number: 0012 	 2026-06-19T00:00:00.000Z
-- ADR 0022 / 0023: invited provider accounts authenticate with bearer tokens
-- whose hashes are stored in D1.

CREATE TABLE provider_accounts (
  id           TEXT PRIMARY KEY,
  provider_id  TEXT NOT NULL REFERENCES providers(id),
  display_name TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  created_at   TEXT NOT NULL,
  disabled_at  TEXT
);

CREATE INDEX idx_provider_accounts_provider
  ON provider_accounts (provider_id, status);

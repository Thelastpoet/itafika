-- Migration number: 0003 	 2026-06-08T21:00:00.000Z

ALTER TABLE quotes ADD COLUMN expires_at TEXT;

CREATE INDEX idx_quotes_expires_at ON quotes (expires_at);

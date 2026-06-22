-- Migration number: 0014 	 2026-06-19T00:00:02.000Z
-- ADR 0022 / 0025: provider-visible booking tasks for human-in-the-loop
-- confirmation.

CREATE TABLE provider_booking_tasks (
  id                   TEXT PRIMARY KEY,
  delivery_tracking_id TEXT NOT NULL REFERENCES deliveries(tracking_id),
  provider_id          TEXT NOT NULL REFERENCES providers(id),
  provider_ref         TEXT,
  status               TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at           TEXT NOT NULL,
  expires_at           TEXT NOT NULL,
  responded_at         TEXT,
  responded_by         TEXT REFERENCES provider_accounts(id),
  response_note        TEXT,
  UNIQUE (delivery_tracking_id)
);

CREATE INDEX idx_provider_booking_tasks_provider
  ON provider_booking_tasks (provider_id, status, created_at);

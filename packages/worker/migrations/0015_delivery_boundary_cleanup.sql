-- Migration number: 0015 	 2026-06-19T00:00:03.000Z
-- ADR 0025 + 0024: cleanup the legacy delivery boundary so active orchestration
-- uses shop-owned references and compatibility fields can be redacted.

CREATE TABLE deliveries_new (
  tracking_id                TEXT PRIMARY KEY,
  quote_id                   TEXT NOT NULL REFERENCES quotes(quote_id),
  status                     TEXT NOT NULL CHECK (
    status IN (
      'booking_requested',
      'booking_confirmed',
      'package_picked',
      'in_transit',
      'at_sorting_hub',
      'ready_for_pickup',
      'delivered',
      'delivery_cancelled'
    )
  ),
  sender_name                TEXT,
  sender_phone               TEXT,
  recipient_name             TEXT,
  recipient_phone            TEXT,
  package_description        TEXT,
  instructions               TEXT,
  sender_id_number           TEXT,
  recipient_id_number        TEXT,
  alternate_collector_name   TEXT,
  alternate_collector_phone   TEXT,
  alternate_collector_id_number TEXT,
  provider_ref               TEXT,
  shop_order_ref             TEXT,
  shop_handoff_url           TEXT,
  created_at                 TEXT NOT NULL
);

CREATE TABLE tracking_events_stash (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_id TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (
    status IN (
      'booking_requested',
      'booking_confirmed',
      'package_picked',
      'in_transit',
      'at_sorting_hub',
      'ready_for_pickup',
      'delivered',
      'delivery_cancelled'
    )
  ),
  at          TEXT NOT NULL,
  note        TEXT,
  source      TEXT NOT NULL DEFAULT 'manual'
);

CREATE TABLE provider_booking_tasks_stash (
  id                   TEXT PRIMARY KEY,
  delivery_tracking_id TEXT NOT NULL,
  provider_id          TEXT NOT NULL,
  provider_ref         TEXT,
  status               TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at           TEXT NOT NULL,
  expires_at           TEXT NOT NULL,
  responded_at         TEXT,
  responded_by         TEXT,
  response_note        TEXT
);

INSERT INTO deliveries_new (
  tracking_id,
  quote_id,
  status,
  sender_name,
  sender_phone,
  recipient_name,
  recipient_phone,
  package_description,
  instructions,
  sender_id_number,
  recipient_id_number,
  alternate_collector_name,
  alternate_collector_phone,
  alternate_collector_id_number,
  provider_ref,
  shop_order_ref,
  shop_handoff_url,
  created_at
)
SELECT
  tracking_id,
  quote_id,
  status,
  sender_name,
  sender_phone,
  recipient_name,
  recipient_phone,
  package_description,
  instructions,
  sender_id_number,
  recipient_id_number,
  alternate_collector_name,
  alternate_collector_phone,
  alternate_collector_id_number,
  provider_ref,
  shop_order_ref,
  shop_handoff_url,
  created_at
FROM deliveries;

INSERT INTO tracking_events_stash (id, tracking_id, status, at, note, source)
SELECT id, tracking_id, status, at, note, source
FROM tracking_events;

INSERT INTO provider_booking_tasks_stash (
  id,
  delivery_tracking_id,
  provider_id,
  provider_ref,
  status,
  created_at,
  expires_at,
  responded_at,
  responded_by,
  response_note
)
SELECT
  id,
  delivery_tracking_id,
  provider_id,
  provider_ref,
  status,
  created_at,
  expires_at,
  responded_at,
  responded_by,
  response_note
FROM provider_booking_tasks;

DROP TABLE provider_booking_tasks;
DROP TABLE tracking_events;
DROP TABLE deliveries;
ALTER TABLE deliveries_new RENAME TO deliveries;

CREATE UNIQUE INDEX idx_deliveries_quote_id ON deliveries (quote_id);

CREATE TABLE tracking_events_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_id TEXT NOT NULL REFERENCES deliveries(tracking_id),
  status      TEXT NOT NULL CHECK (
    status IN (
      'booking_requested',
      'booking_confirmed',
      'package_picked',
      'in_transit',
      'at_sorting_hub',
      'ready_for_pickup',
      'delivered',
      'delivery_cancelled'
    )
  ),
  at          TEXT NOT NULL,
  note        TEXT,
  source      TEXT NOT NULL DEFAULT 'manual'
);

INSERT INTO tracking_events_new (id, tracking_id, status, at, note, source)
SELECT id, tracking_id, status, at, note, source
FROM tracking_events_stash;

DROP TABLE tracking_events_stash;
ALTER TABLE tracking_events_new RENAME TO tracking_events;

CREATE INDEX idx_tracking_events_delivery ON tracking_events (tracking_id, id);

CREATE TABLE provider_booking_tasks_new (
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

INSERT INTO provider_booking_tasks_new (
  id,
  delivery_tracking_id,
  provider_id,
  provider_ref,
  status,
  created_at,
  expires_at,
  responded_at,
  responded_by,
  response_note
)
SELECT
  id,
  delivery_tracking_id,
  provider_id,
  provider_ref,
  status,
  created_at,
  expires_at,
  responded_at,
  responded_by,
  response_note
FROM provider_booking_tasks_stash;

DROP TABLE provider_booking_tasks_stash;
ALTER TABLE provider_booking_tasks_new RENAME TO provider_booking_tasks;

CREATE INDEX idx_provider_booking_tasks_provider
  ON provider_booking_tasks (provider_id, status, created_at);

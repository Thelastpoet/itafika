-- Migration number: 0013 	 2026-06-19T00:00:01.000Z
-- ADR 0025: expand public tracking states and move active delivery booking to
-- shop-owned references.

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
  sender_name                TEXT NOT NULL,
  sender_phone               TEXT NOT NULL,
  recipient_name             TEXT NOT NULL,
  recipient_phone            TEXT NOT NULL,
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

INSERT INTO tracking_events_stash (id, tracking_id, status, at, note, source)
SELECT id, tracking_id, status, at, note, source
FROM tracking_events;

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
  NULL,
  NULL,
  created_at
FROM deliveries;

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

-- Migration number: 0002 	 2026-06-08T16:36:00.000Z

CREATE TABLE quotes (
  quote_id            TEXT PRIMARY KEY,
  provider_type       TEXT NOT NULL,
  provider_name       TEXT NOT NULL,
  estimated_cost_kes  INTEGER NOT NULL,
  estimated_time      TEXT NOT NULL,
  reliability_score   REAL,
  origin_zone_id      TEXT NOT NULL,
  destination_zone_id TEXT NOT NULL,
  package_weight_kg   REAL NOT NULL,
  created_at          TEXT NOT NULL
);

CREATE TABLE deliveries (
  tracking_id         TEXT PRIMARY KEY,
  quote_id            TEXT NOT NULL REFERENCES quotes(quote_id),
  status              TEXT NOT NULL CHECK (status IN ('package_picked', 'in_transit', 'at_sorting_hub', 'ready_for_pickup', 'delivered')),
  sender_name         TEXT NOT NULL,
  sender_phone        TEXT NOT NULL,
  recipient_name      TEXT NOT NULL,
  recipient_phone     TEXT NOT NULL,
  package_description  TEXT,
  created_at          TEXT NOT NULL
);

CREATE TABLE tracking_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_id TEXT NOT NULL REFERENCES deliveries(tracking_id),
  status      TEXT NOT NULL CHECK (status IN ('package_picked', 'in_transit', 'at_sorting_hub', 'ready_for_pickup', 'delivered')),
  at          TEXT NOT NULL,
  note        TEXT
);

CREATE INDEX idx_tracking_events_delivery ON tracking_events (tracking_id, id);

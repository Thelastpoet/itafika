-- Migration number: 0001 	 2026-06-08T16:33:14.076Z

CREATE TABLE zones (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  type  TEXT NOT NULL CHECK (type IN ('cbd_hub', 'stage', 'residential_area')),
  town  TEXT NOT NULL,
  lat   REAL,
  lng   REAL
);

CREATE TABLE providers (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('boda_rider', 'matatu_sacco', 'bus', 'national_courier')),
  reliability_score REAL NOT NULL
);

CREATE TABLE rates (
  provider_id         TEXT NOT NULL REFERENCES providers(id),
  origin_zone_id      TEXT NOT NULL REFERENCES zones(id),
  destination_zone_id TEXT NOT NULL REFERENCES zones(id),
  base_cost_kes       INTEGER NOT NULL,
  cost_per_kg_kes     INTEGER NOT NULL,
  est_time            TEXT NOT NULL,
  max_weight_kg       REAL,
  source              TEXT NOT NULL,
  PRIMARY KEY (provider_id, origin_zone_id, destination_zone_id)
);

CREATE INDEX idx_rates_route ON rates (origin_zone_id, destination_zone_id);

CREATE TABLE freshness (
  town         TEXT PRIMARY KEY,
  last_updated TEXT NOT NULL
);

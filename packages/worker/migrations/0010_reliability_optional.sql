-- Migration number: 0010 	 2026-06-10T00:00:02.000Z
-- ADR 0021: reliability_score is asserted, not measured. A provider with no basis
-- for a value omits it rather than guessing, so the column must allow NULL.

-- Defer FK checks so the table rebuilds below are validated only at end of
-- transaction, when the schema is consistent again.
PRAGMA defer_foreign_keys = TRUE;

-- rates has a foreign key into providers(id), and the runtime refuses to drop a table
-- a foreign key still points at. So move rates out of the way, rebuild providers
-- without the NOT NULL, then restore rates against the new table. rates keeps its
-- current schema (0006 + collection_type from 0007). Columns are listed explicitly so
-- the copy is insensitive to column order.
CREATE TABLE rates_stash (
  provider_id         TEXT NOT NULL,
  origin_zone_id      TEXT NOT NULL,
  destination_zone_id TEXT NOT NULL,
  base_cost_kes       INTEGER NOT NULL,
  cost_per_kg_kes     INTEGER NOT NULL,
  est_time            TEXT NOT NULL,
  max_weight_kg       REAL,
  source              TEXT NOT NULL,
  collection_type     TEXT NOT NULL DEFAULT 'office_pickup'
);
INSERT INTO rates_stash (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source, collection_type)
  SELECT provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source, collection_type FROM rates;
DROP TABLE rates;

CREATE TABLE providers_new (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL,
  reliability_score REAL
);
INSERT INTO providers_new (id, name, type, reliability_score)
  SELECT id, name, type, reliability_score FROM providers;
DROP TABLE providers;
ALTER TABLE providers_new RENAME TO providers;

CREATE TABLE rates (
  provider_id         TEXT NOT NULL REFERENCES providers(id),
  origin_zone_id      TEXT NOT NULL REFERENCES zones(id),
  destination_zone_id TEXT NOT NULL REFERENCES zones(id),
  base_cost_kes       INTEGER NOT NULL,
  cost_per_kg_kes     INTEGER NOT NULL,
  est_time            TEXT NOT NULL,
  max_weight_kg       REAL,
  source              TEXT NOT NULL,
  collection_type     TEXT NOT NULL DEFAULT 'office_pickup'
    CHECK (collection_type IN ('office_pickup', 'door_delivery')),
  PRIMARY KEY (provider_id, origin_zone_id, destination_zone_id)
);
CREATE INDEX idx_rates_route ON rates (origin_zone_id, destination_zone_id);
INSERT INTO rates (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source, collection_type)
  SELECT provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source, collection_type FROM rates_stash;
DROP TABLE rates_stash;

-- Migration number: 0006 	 2026-06-10T00:00:00.000Z
-- ADR 0019: transport modes become a governed registry, not a closed enum.

-- Defer FK checks so the table rebuilds below are validated only at end of
-- transaction, when the schema is consistent again.
PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE modes (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  source      TEXT NOT NULL
);

-- Rebuild providers to drop the closed CHECK (type IN (...)) from 0001_init.sql, so
-- provider type is an open identifier drawn from the modes registry rather than a
-- fixed set (ADR 0019). The registry relationship (providers.type -> modes.id) is
-- enforced in data validation (data:validate), keeping a new mode a pure data change.
--
-- rates has a foreign key into providers(id), and the runtime refuses to drop a table
-- a foreign key still points at. So move rates out of the way, rebuild providers,
-- then restore rates against the new table. rates keeps its original 0001 schema
-- here; migration 0007 adds collection_type. Columns are listed explicitly so the
-- copy is insensitive to column order.
CREATE TABLE rates_stash (
  provider_id         TEXT NOT NULL,
  origin_zone_id      TEXT NOT NULL,
  destination_zone_id TEXT NOT NULL,
  base_cost_kes       INTEGER NOT NULL,
  cost_per_kg_kes     INTEGER NOT NULL,
  est_time            TEXT NOT NULL,
  max_weight_kg       REAL,
  source              TEXT NOT NULL
);
INSERT INTO rates_stash (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source)
  SELECT provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source FROM rates;
DROP TABLE rates;

CREATE TABLE providers_new (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL,
  reliability_score REAL NOT NULL
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
  PRIMARY KEY (provider_id, origin_zone_id, destination_zone_id)
);
CREATE INDEX idx_rates_route ON rates (origin_zone_id, destination_zone_id);
INSERT INTO rates (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source)
  SELECT provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source FROM rates_stash;
DROP TABLE rates_stash;

-- Migration number: 0008 	 2026-06-10T00:00:02.000Z
-- ADR 0017: county is the top level of the checkout funnel; add it to zones.

ALTER TABLE zones ADD COLUMN county TEXT;

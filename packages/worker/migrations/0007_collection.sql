-- Migration number: 0007 	 2026-06-10T00:00:01.000Z
-- ADR 0016: surface collection type and collection point on quotes.

ALTER TABLE rates ADD COLUMN collection_type TEXT NOT NULL DEFAULT 'office_pickup'
  CHECK (collection_type IN ('office_pickup', 'door_delivery'));

-- Persist the collection facts on the quote so a booked Delivery echoes the same
-- option the customer chose. collection_point_* is denormalised from the
-- destination zone for office_pickup; null for door_delivery.
ALTER TABLE quotes ADD COLUMN collection_type TEXT;
ALTER TABLE quotes ADD COLUMN collection_point_zone_id TEXT;
ALTER TABLE quotes ADD COLUMN collection_point_name TEXT;
ALTER TABLE quotes ADD COLUMN collection_point_town TEXT;

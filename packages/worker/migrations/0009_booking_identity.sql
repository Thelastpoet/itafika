-- Migration number: 0009 	 2026-06-10T00:00:03.000Z
-- ADR 0018: capture handover instructions and collection identity on a booking.

ALTER TABLE deliveries ADD COLUMN instructions TEXT;
ALTER TABLE deliveries ADD COLUMN sender_id_number TEXT;
ALTER TABLE deliveries ADD COLUMN recipient_id_number TEXT;
ALTER TABLE deliveries ADD COLUMN alternate_collector_name TEXT;
ALTER TABLE deliveries ADD COLUMN alternate_collector_phone TEXT;
ALTER TABLE deliveries ADD COLUMN alternate_collector_id_number TEXT;

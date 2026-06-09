-- Migration number: 0005 	 2026-06-09T10:00:00.000Z

-- Stage 2: route booking through the adapter runtime.
-- provider_id lets booking rebuild the originating provider's adapter and call book().
-- provider_ref records the adapter's own booking reference (internal; not exposed in the API).
-- source records which producer wrote each tracking event (booking | manual | adapter),
-- making the single event log reviewable. All three are internal columns.

ALTER TABLE quotes ADD COLUMN provider_id TEXT;

ALTER TABLE deliveries ADD COLUMN provider_ref TEXT;

ALTER TABLE tracking_events ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';

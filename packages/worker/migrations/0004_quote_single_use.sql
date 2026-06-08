-- Migration number: 0004 	 2026-06-08T21:40:00.000Z

CREATE UNIQUE INDEX idx_deliveries_quote_id ON deliveries (quote_id);

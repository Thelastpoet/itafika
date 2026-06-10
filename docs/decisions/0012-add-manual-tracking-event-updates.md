# ADR 0012 — Allow manual tracking updates

**Status:** Accepted
**Date:** 2026-06-08

## Context

Right now, once a delivery is booked, its status stays as "package_picked" and doesn't change. We need a way to update the status as the parcel moves through the delivery process.

## Decision

Add a `POST /v1/deliveries/{tracking_id}/events` endpoint. This allows someone to manually add new tracking events (like "in_transit" or "delivered") to a delivery.

Rules:
- The request includes the next universal status.
- The Worker sets the timestamp automatically.
- Statuses can only move forward (e.g., you can't go from "delivered" back to "in_transit").

## Rejected options

### Wait for live adapters before adding any status progression

Rejected because it blocks meaningful lifecycle testing and leaves tracking effectively static.

### Let clients overwrite delivery status directly

Rejected because it weakens the event history model and makes lifecycle auditing less reliable.

### Add provider-specific tracking states now

Rejected because Phase 1 is still centered on the universal status vocabulary.

## Consequences

Positive:

- tracking history can grow beyond booking
- status progression is validated
- manual tools and early integrations have a clear path

Tradeoffs:

- this is still a simple Phase 1 mechanism, not a full integration workflow

That tradeoff is intentional. It gives the project a usable lifecycle step without skipping ahead to later-phase infrastructure.

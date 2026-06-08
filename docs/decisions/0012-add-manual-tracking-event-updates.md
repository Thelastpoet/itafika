# ADR 0012: Add Manual Tracking Event Updates for Phase 1

- Status: Accepted
- Date: 2026-06-08

## Context

The Phase 1 API already supports booking a delivery and reading unified tracking history.

What it does not yet support is any controlled way to grow that history after booking. The current implementation records the initial `package_picked` event and stops there.

The documented next phase calls for better delivery lifecycle behavior before full live adapter integration or background job infrastructure.

## Decision

Add a manual status update path to the canonical API:

- `POST /v1/deliveries/{tracking_id}/events`

This endpoint is the Phase 1 way to append tracking history in a controlled, reviewable manner.

Rules:

- the request carries the next universal `TrackingStatus`
- the Worker sets the event timestamp server-side
- an optional note may be included
- status progression may stay the same or move forward
- status regression is rejected

This keeps the lifecycle honest without pretending live adapters, webhooks, or queue-based workflows are already in place.

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

# ADR 0014: Use adapters for bookings

**Status:** Accepted
**Date:** 2026-06-09

## Context

After connecting quotes to adapters, we need to do the same for bookings. Previously, the Worker would record a booking but wouldn't tell the provider about it.

## Decision

The Worker will now use adapters to process bookings. This means when a delivery is created, the code will call the specific provider's adapter. We've also updated our database to keep track of which provider is responsible for each quote and delivery.

The quote-validity check runs before `book()` so the runtime never dispatches a
booking for an expired or already-booked quote. The unique index on
`deliveries.quote_id` (migration 0004) remains the authority for races; a booking
that loses the race fails soft and returns "not bookable" rather than throwing.

This change touches neither the public API nor the adapter contract; both already
specify this behavior. Per the spec-first rule it needs no `openapi.yaml` change.

## Rejected options

### Look the provider up by name or type at booking time

Rejected because names are display strings and types are not unique; only a stable
`provider_id` reliably selects one adapter. IDs are forever per the data rules.

### Expose `provider_ref` / `provider_id` in API responses

Rejected for now. They are runtime-internal identifiers; exposing them is an
additive API change that can be made later under its own ADR if a client needs it.

### Keep hard-coding the initial status

Rejected because it leaves booking nominally adapter-driven while the provider has
no say in the outcome, the exact gap this stage exists to close.

## Consequences

Positive:

- request → adapter interface → response is now the real path for booking too, not
  just quoting.
- live and human-in-the-loop adapters have a concrete seam: their `book()` result
  drives the recorded status and reference.

Tradeoffs:

- the static adapter is now on the critical booking path.
- quotes created before migration 0005 carry a null `provider_id` and are therefore
  not bookable through an adapter; given the 24-hour quote TTL this drains naturally
  and needs no backfill.

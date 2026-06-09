# ADR 0014: Route Booking Through the Adapter Runtime

- Status: Accepted
- Date: 2026-06-09

## Context

[ADR 0013](0013-wire-worker-to-adapter-runtime.md) wired the quote flow through
`LogisticsProviderInterface` but explicitly left booking out of scope. As a result
booking still bypassed the adapter seam: `createDelivery` recorded a row and
hard-coded the initial status to `package_picked`, never consulting the provider
that produced the quote.

This is the second half of proving the architecture in runtime code. The contract
already defines `book()`; only the reference runtime had not adopted it.

The blocker was identity: a booked quote did not know which provider produced it.
The `quotes` table stored `provider_type` and `provider_name` but not a stable
`provider_id`, so booking could not rebuild the right adapter.

## Decision

Make the adapter the booking execution path in the reference Worker.

- Persist an internal `provider_id` with each quote (migration 0005). The quote
  response is unchanged; `provider_id` is never serialized to API clients.
- The aggregator returns `provider_id` alongside each option so the Worker can
  persist it; the public `Quote` shape is unaffected.
- On booking, validate the quote is still bookable, rebuild that provider's adapter
  from the stored quote row, and call `book()`. The returned `provider_ref` and
  `status` are recorded instead of the previously hard-coded values.
- `provider_ref` is stored internally on `deliveries` (migration 0005), giving a
  future `track(provider_ref)` something to call.

The quote-validity check runs before `book()` so the runtime never dispatches a
booking for an expired or already-booked quote. The unique index on
`deliveries.quote_id` (migration 0004) remains the authority for races; a booking
that loses the race fails soft and returns "not bookable" rather than throwing.

This change touches neither the public API nor the adapter contract — both already
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
no say in the outcome — the exact gap this stage exists to close.

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

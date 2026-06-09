# ADR 0015: Tracking Update Model — One Event Log, Many Producers

- Status: Accepted
- Date: 2026-06-09

## Context

Tracking is event-sourced: `tracking_events` is an append-only log and the current
status is the latest event. [ADR 0012](0012-add-manual-tracking-event-updates.md)
added a guarded manual update path (forward-only via `canAdvanceTrackingStatus`).

As adapters move into the runtime ([ADR 0013](0013-wire-worker-to-adapter-runtime.md),
[ADR 0014](0014-route-booking-through-adapter-runtime.md)), a question follows: how
do adapter-reported statuses relate to manual updates? Without a decision we risk two
competing sources of truth — an adapter status and a manual status — that must be
reconciled at read time.

## Decision

There is **one tracking log, with multiple producers**.

- The `tracking_events` log is canonical. Status is always the latest event. There
  is no separate adapter-reported status field.
- Producers all append through the same forward-only, `canAdvanceTrackingStatus`-
  guarded pipeline:
  - **booking** — the initial event written by `book()`'s result.
  - **manual** — internal/operator updates (ADR 0012).
  - **adapter** — pull-based `track()` or push-based webhooks, when implemented.
- In Phase 1, manual/internal updates are the source of truth. The static adapter
  has no `track()`, so no polling happens now — we do not pretend Phase 2 exists.
- Each event records its `source` (internal column, migration 0005) so the log is
  reviewable: it is possible to see whether a status came from booking, an operator,
  or a provider.
- `provider_ref` is stored at booking (ADR 0014) precisely so a future
  `track(provider_ref)` or webhook handler can map a provider's own state and append
  to this same log.

## Rejected options

### A separate adapter-reported status reconciled at read time

Rejected because it creates two sources of truth and a reconciliation rule to
maintain. The universal statuses exist so every producer can speak one language into
one log.

### Implement a static `track()` now

Rejected because a static adapter can only echo the status we already recorded — it
would be circular and would imply provider-driven tracking that does not exist yet.

## Consequences

Positive:

- one model for every update source; adapters and webhooks become "just another
  producer," not a parallel system.
- the `source` column makes history auditable as the producers multiply.

Tradeoffs:

- a provider whose real state moves backward cannot be represented; the forward-only
  guard is deliberate for Phase 1 and can be revisited if a real provider needs it.

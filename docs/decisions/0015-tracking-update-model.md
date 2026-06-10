# ADR 0015 — Simplify tracking as a single event log

**Status:** Accepted
**Date:** 2026-06-09

## Context

As we add more ways to update a delivery's status (manually or via providers), we need a clear way to keep track of it all without having competing versions of the "truth."

## Decision

We will use a **single, append-only event log** for tracking. Every update—whether it's from a manual entry, a provider, or a webhook—gets added as a new event in this log. The current status is always the latest event. We also record the source of each update (e.g., "manual" or "provider") for auditing.

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

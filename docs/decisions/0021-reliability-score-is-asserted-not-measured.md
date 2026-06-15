# ADR 0021 — Treat `reliability_score` as asserted, not measured

**Status:** Accepted
**Date:** 2026-06-10

## Context

Every quote carries a `reliability_score` (0–1), and the docs have shown examples like
`0.98` and `0.92`. The adapter contract used to say "the engine will adjust this based
on real results over time." None of that is true today: there is no measurement loop,
no real deliveries to learn from, and every rate in the dataset is still marked
`seed-illustrative`.

This matters more here than it would elsewhere. Itafika's core promise is trustworthy
open data with provenance — `SCHEMA.md` requires a `source` for every price. A
two-decimal reliability score with no source behind it breaks that promise on the most
visible field in the API. The concept doc correctly defers measured reliability to
Phase 3, when there are real deliveries to measure.

## Decision

Until a measurement loop exists:

1. **`reliability_score` becomes optional** on quotes, `ProviderInfo`, and the
   `/v1/options` surface. An adapter that has no basis for a score omits it, the same
   way `quote()` returns `null` for a route it doesn't serve: don't guess.
2. **Where a score is given, it is an asserted value** — a community judgment like any
   other data contribution, subject to the same review. The spec describes it as
   "asserted, not measured."
3. **No claim of automatic adjustment.** Docs and the contract must not say the engine
   tunes this score until an engine that does so actually exists. Introducing one is a
   future ADR (the Phase 3 work in the concept doc).
4. **Examples use round, modest values** (e.g. `0.9`), not false precision like `0.98`.

Implementation order follows GOVERNANCE.md: when accepted, `spec/openapi.yaml` changes
first (field becomes optional, description updated), then `packages/core` types and
the worker follow.

## Rejected options

### Keep the field required with seeded values

Rejected because it forces every contributor to invent a number. A required score with
no measurement behind it is fabricated data wearing the uniform of real data — the
exact thing the `source` rule exists to prevent.

### Remove the field entirely until Phase 3

Rejected because the field is doing real work in the API shape: shops are told they can
rank options by it, and reliability is a genuine differentiator between a SACCO desk
and a courier. Removing it now and re-adding it later is a breaking change in both
directions. Optional-with-honest-semantics keeps the slot without the false claim.

### Rename to something like `asserted_reliability`

Rejected because the name would have to change again when measurement arrives —
another breaking change. The semantics live in the spec description, not the name.

## Consequences

Positive:

- the API stops presenting invented numbers as measured ones; the provenance promise
  holds across every field, not just prices.
- adapters get an honest default: omit rather than guess.

Tradeoffs:

- consumers can no longer rely on the field being present and must handle its absence
  when sorting or displaying options.
- making a required field optional is a contract change for `/v1`; existing example
  payloads and tests need a pass.

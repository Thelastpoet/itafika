# Next Phase Task List

This file turns the current project state into a practical work queue.

It is not the long-term roadmap. It is the next set of concrete tasks that would move the repository forward in a useful way.

Use it with:

- `docs/status.md` for what exists today
- `docs/Itafika-Concept-Doc.md` for the long-term direction
- `spec/` for the canonical contract

## Recommended next phase

The Phase 1 reference **code path is essentially complete**: quotes and booking run
through the adapter runtime, tracking is settled on the one-log model, and the adapter
conformance kit now backs the open-contribution promise. The remaining pure-Phase-1
code threads either depend on a live (non-static) adapter — which is Phase 2 — or are
data work.

So the next highest-value effort is:

**improve the actual dataset, then grow live adapter coverage (Phase 2)**

The dataset is the project's long-term asset and is the first thing not blocked on
anything else. Live adapter work is now unblocked too: the runtime seam and the
conformance kit are both in place, so a first real adapter has everything it needs.

## Priority order

### Completed recently

- deployment guide and remote D1 workflow
- live hosted Worker deployment
- adapter package skeleton with a static reference adapter
- dataset validation workflow
- dataset freshness endpoint
- quote expiry and single-use booking policy
- manual tracking event update path
- first sourced Easy Coach rate replacement
- CI for validation, tests, and typecheck
- compatibility date aligned with the runtime currently used in local verification
- quote flow wired through the adapter runtime (ADR 0013)
- booking wired through the adapter runtime, with internal `provider_id`/`provider_ref` (ADR 0014)
- tracking-update model decided: one event log, manual is Phase-1 truth, source recorded per event (ADR 0015)
- adapter conformance kit (`@itafika/adapters/conformance`) backing the contract's "pass the conformance tests" promise

### Phase-2-gated — Extend delivery lifecycle behavior

The lifecycle (quote, booking, tracking, manual events) is built, and how the update
sources coexist is decided (ADR 0015: one log, manual is truth, source per event). The
only remaining thread — adapter-driven `track()` and webhook-driven updates — needs a
live (non-static) adapter to be meaningful, so it lands with the first live adapter in
Phase 2, not as standalone Phase-1 work.

### Done — Move provider flow toward adapter runtime integration

Quotes and booking now run through `LogisticsProviderInterface` (ADRs 0013, 0014),
and the tracking-update model is decided (ADR 0015): one event log, manual is the
Phase-1 source of truth, each event records its source. The remaining thread is
adapter-driven `track()` / webhooks, which only becomes real with a non-static
adapter — captured under "Extend delivery lifecycle behavior" above.

### P1 — Improve the actual dataset

Why this matters:

- the seed data is still partly illustrative
- the open data is still the core long-term asset of the project

Tasks:

- replace `seed-illustrative` rows with sourced field data
- expand town and route coverage carefully
- improve provenance quality on existing rows
- decide how freshness updates should be reviewed and enforced

Done when:

- the dataset is meaningfully more trustworthy, not just more structured

### P2 — Checkout-delivery direction (ADRs 0016–0019)

Why this matters:

- today the contract returns A→B prices, but a real Kenyan checkout needs the full
  delivery step: county → mode → provider → collection point → handover instructions
- the spec now states these expectations (ADRs 0016–0019, all `Proposed`); the
  implementation is open work

Tasks (each additive within `/v1`, after the relevant ADR is signed off):

- establish the modes registry (ADR 0019): add `modes.csv` + `GET /v1/modes`, type
  `provider.type` as an FK into it, and validate it in `data:validate` — after which
  new modes are pure data work
- add `collection_type` to `rates.csv` and `county` to `zones.csv`, then backfill
- regenerate types (`pnpm gen:types`) and implement the new fields/endpoint in core,
  adapters, and the Worker: collection facts on quotes (0016), `GET /v1/options`
  discovery (0017), booking instructions/identity (0018)
- extend the static adapter's `coverage()` and the conformance kit accordingly

Done when:

- a shop can render the full checkout delivery step from Itafika data alone

## What should wait

These are important, but not the best next use of effort:

- broad live provider coverage
- Workflows-based long-running booking
- Queues-based provider jobs
- Durable Objects for coordination
- ranking-policy expansion beyond the current simple default

Those become much easier once the current code path is more complete.

## Suggested implementation order

1. improve the actual dataset (sourced rates, broader coverage, provenance)
2. build the first live adapter, exercising the runtime seam and the conformance kit
3. wire adapter-driven `track()` / webhook updates into the one event log (with that adapter)

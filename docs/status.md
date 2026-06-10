# Current Status

This project is in active development.

This document is the plain-language source of truth for what exists in the repository today.

Use it alongside the other docs:

- `README.md` explains the project at a high level.
- `docs/Itafika-Concept-Doc.md` explains the long-term vision.
- `docs/next-phase.md` lists the most useful next implementation tasks.
- `docs/release-checklist.md` is the maintainer check before a release or milestone.
- `spec/` defines the contract and data format.

If there is ever a difference between the vision and the code, this file should tell contributors what is real right now.

## What is implemented now

The current branch has a working Phase 1 foundation:

- a `pnpm` monorepo
- `@itafika/core` with generated API types and a quote engine
- `@itafika/worker` as the Cloudflare Worker reference API
- `@itafika/adapters` with a reference static adapter and a reusable adapter conformance kit (`@itafika/adapters/conformance`)
- D1 migrations and a seed flow
- dataset validation for `spec/data/`
- CI for validation, tests, and typecheck
- the Phase 1 HTTP endpoints, including dataset freshness
- a small checkout example in `examples/simple-shop`
- automated tests for the core package and the Worker package
- a live hosted reference Worker deployment

## What the Worker does today

The Worker currently supports:

- `GET /v1/zones`
- `GET /v1/zones/search`
- `GET /v1/freshness`
- `POST /v1/quotes`
- `POST /v1/deliveries`
- `GET /v1/deliveries/{tracking_id}/track`
- `POST /v1/deliveries/{tracking_id}/events`

Current behavior is intentionally simple:

- quotes are computed from the seeded dataset in D1, through one static adapter per provider
- quotes expire after 24 hours
- a quote can only be booked once
- booking runs through the originating provider's adapter (`book()`) and records the delivery in D1
- tracking returns the recorded delivery status and history
- tracking history can be advanced through a manual/internal event path; every event records its source (booking/manual/adapter) on one log

## What is partial or intentionally simple

Some parts of the contract are in place before the full implementation behind them exists.

- `package_type` is still part of the quote request shape, but it is not yet used in quote logic
- booking dispatches through the adapter runtime, but the only adapter is the static one, so it records the booking rather than calling a live provider system
- tracking is unified on one event log with a recorded source per event; adapter-driven (`track()`) and webhook-driven updates still come later
- rates in `spec/data/` are still marked `seed-illustrative` unless replaced by sourced field data

This is normal for the current phase. The important thing is to describe it clearly.

## Specified, not yet implemented (checkout-delivery direction)

ADRs 0016–0019 extend the contract so a shop can build the full Kenyan checkout
delivery step (county → mode → provider → collection point → instructions), not just
fetch A→B prices. The spec states these as **expectations**; they are `Proposed` and
not yet served by the reference Worker or present in the dataset:

- **collection point + `collection_type` on quotes** (ADR 0016) — where/how the
  recipient collects (office pickup vs. door delivery)
- **`GET /v1/options` discovery surface** + `county` on zones and `town`/`county`
  zone filters (ADR 0017) — browse options into a town before pricing
- **`instructions`, `id_number`, `alternate_collector` on bookings** (ADR 0018) —
  capture "give to so-and-so" and who collects
- **transport modes as a governed registry** — `GET /v1/modes` + `modes.csv`, with
  `ProviderType` as an open identifier (ADR 0019) — so new modes (`shuttle`, `taxi`,
  `cargo_truck`, …) are added as data, never by changing code or the contract

Each is additive within `/v1`. Implementation (data backfill, `gen:types`, Worker)
is open to contribution.

## What is planned but not built yet

These are part of the project direction, but they are not implemented in this repository yet:

- live provider integrations
- background jobs with Queues
- long-running booking flows with Workflows
- Durable Objects for coordination where needed

## Deployment notes

Local development works now.

The hosted reference Worker is live at:

- `https://itafika-api.emcie4.workers.dev`

Repository-level deployment still needs project-specific setup for any new environment:

- create a real Cloudflare D1 database in that account
- replace the placeholder `database_id` in `packages/worker/wrangler.jsonc`
- apply remote migrations
- seed the remote database

Use [`docs/deploy-worker.md`](deploy-worker.md) for the exact deployment steps.

Even with a live deployment, the project should still be treated as active development software, not a finished production platform.

## Current implementation priority

The Phase 1 reference code path is essentially complete: quotes and booking run through
the adapter runtime (ADRs 0013–0014), tracking follows the one-log model (ADR 0015),
and the adapter conformance kit backs the open-contribution promise. What remains is no
longer standalone Phase 1 code:

- **dataset** — replace illustrative rates with sourced field data and broaden coverage (the next major effort; data work, not code)
- **first live adapter (Phase 2)** — now unblocked by the runtime seam and the conformance kit; adapter-driven `track()` / webhook updates land with it

## What contributors should assume

When contributing, use these labels consistently:

- `Implemented`
- `Partial`
- `Specified, not yet implemented`
- `Planned`

That keeps expectations clear for:

- non-code contributors improving data
- developers working on the reference implementation
- future implementers building from the spec

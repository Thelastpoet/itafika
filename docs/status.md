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
- `@itafika/adapters` with a reference static adapter
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

- quotes are computed from the seeded dataset in D1
- quotes expire after 24 hours
- a quote can only be booked once
- booking a delivery records it in D1
- tracking returns the recorded delivery status and history
- tracking history can now be advanced through a manual/internal event path

## What is partial or intentionally simple

Some parts of the contract are in place before the full implementation behind them exists.

- `package_type` is still part of the quote request shape, but it is not yet used in quote logic
- booking creates a delivery record, but does not dispatch to a live provider system
- tracking is unified, and Phase 1 now supports manual/internal tracking event updates; adapter-driven and webhook-driven updates still come later
- rates in `spec/data/` are still marked `seed-illustrative` unless replaced by sourced field data

This is normal for the current phase. The important thing is to describe it clearly.

## What is planned but not built yet

These are part of the project direction, but they are not implemented in this repository yet:

- live provider integrations
- background jobs with Queues
- long-running booking flows with Workflows
- Durable Objects for coordination where needed
- payment and settlement flows

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

The immediate priority is remaining Phase 1 code work:

- extend how the new tracking event path is actually used
- define and implement the next step toward adapter-driven provider flows
- keep the API and runtime behavior coherent as those pieces land

The broader dataset replacement push still matters, but it is not the next implementation priority right now.

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

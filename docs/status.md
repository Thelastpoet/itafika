# Current Status

This project is in active development.

This document is the plain-language source of truth for what exists in the repository today.

Use it alongside the other docs:

- `README.md` explains the project at a high level.
- `docs/Itafika-Concept-Doc.md` explains the long-term vision.
- `docs/next-phase.md` lists the most useful next implementation tasks.
- `spec/` defines the contract and data format.

If there is ever a difference between the vision and the code, this file should tell contributors what is real right now.

## What is implemented now

The current branch has a working Phase 1 foundation:

- a `pnpm` monorepo
- `@itafika/core` with generated API types and a quote engine
- `@itafika/worker` as the Cloudflare Worker reference API
- D1 migrations and a seed flow
- the four Phase 1 HTTP endpoints
- a small checkout example in `examples/simple-shop`
- automated tests for the core package and the Worker package

## What the Worker does today

The Worker currently supports:

- `GET /v1/zones`
- `GET /v1/zones/search`
- `POST /v1/quotes`
- `POST /v1/deliveries`
- `GET /v1/deliveries/{tracking_id}/track`

Current behavior is intentionally simple:

- quotes are computed from the seeded dataset in D1
- booking a delivery records it in D1
- tracking returns the recorded delivery status and history

## What is partial or intentionally simple

Some parts of the contract are in place before the full implementation behind them exists.

- `package_type` is part of the quote request shape, but the current Worker does not use it in quote calculation yet
- booking creates a delivery record, but does not dispatch to a live provider system
- tracking is unified, but the current flow only records the initial event unless more events are added later
- rates in `spec/data/` are still marked `seed-illustrative` unless replaced by sourced field data

This is normal for the current phase. The important thing is to describe it clearly.

## What is planned but not built yet

These are part of the project direction, but they are not implemented in this repository yet:

- a real adapter package with provider-specific code
- live provider integrations
- background jobs with Queues
- long-running booking flows with Workflows
- Durable Objects for coordination where needed
- payment and settlement flows

## Deployment notes

Local development works now.

Hosted deployment still needs project-specific setup:

- create a real Cloudflare D1 database
- replace the placeholder `database_id` in `packages/worker/wrangler.jsonc`
- apply remote migrations
- seed the remote database

Use [`docs/deploy-worker.md`](deploy-worker.md) for the exact deployment steps.

Until that is done, the Worker should be treated as development software, not a finished hosted service.

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

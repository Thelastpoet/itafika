# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Itafika is an open-source logistics aggregator API for Kenya — a single interface for quoting and booking delivery across riders, matatu/bus SACCOs, and national couriers, with Kenyan locations modelled as **zones/stages** rather than street addresses.

Critically, this is a **spec-first standard, not just an app**. `spec/` defines what Itafika *is* in a language-agnostic way; `packages/` is one correct (Cloudflare/TypeScript) reference implementation of that standard. Anyone could reimplement Itafika in another language from `spec/` alone.

## Current state

The repo is **Phase 1, pre-release**, but the reference implementation exists and is live. `packages/` holds `@itafika/core`, `@itafika/adapters`, and `@itafika/worker`; `examples/simple-shop` is a small consumer. The Worker is deployed at `https://itafika-api.emcie4.workers.dev`. All seven Phase 1 endpoints work, served from seeded D1.

`docs/status.md` is the plain-language source of truth for what is `Implemented` / `Partial` / `Planned` right now — **read it before assuming a feature's maturity** (e.g. the only adapter today is the static one; `package_type` is accepted but unused). `docs/next-phase.md` is the current work queue.

The **checkout-delivery direction** (ADRs 0016–0019, `Proposed`) is specified in the contract but **not yet implemented**: collection point + `collection_type` on quotes, a `GET /v1/options` discovery surface, booking `instructions`/`alternate_collector`, and transport modes as a governed registry (`modes.csv` + `GET /v1/modes`, with `ProviderType` an open identifier). Treat these as direction, not current behavior.

## The spec-first rule (most important workflow constraint)

**The spec leads. Code follows.** This is enforced, not a guideline:

- Any change to the API surface (endpoints, fields, types, tracking states) or the adapter contract starts in `spec/` first — `spec/openapi.yaml` or `spec/adapter-contract.md` — **then** the implementation. Implementation-only changes that contradict the spec get bounced back to fix the spec.
- Such spec changes also require a short ADR in `docs/decisions/` (problem → options → choice) per `GOVERNANCE.md`, and a non-author maintainer's sign-off. Add the ADR to the table in `docs/decisions/README.md`.
- Core TypeScript types are **generated** from the spec (`pnpm gen:types` → `packages/core/src/types.gen.ts`), not hand-written. `@itafika/core/src/types.ts` re-exports them. Keeping Worker, core, and adapters aligned to one contract is the whole point of the split.
- Data changes start in `spec/data/*.csv` and **must include provenance** (the `source` column / PR description explaining how the rate is known).
- The API is versioned by path (`/v1`). Within a major version, changes are additive/backwards-compatible only; breaking changes go to the next major with a deprecation window.

## Commands

Workspace is a pnpm monorepo (pnpm 10, Node >= 20). Run from the repo root unless noted.

```bash
pnpm install                 # bootstrap
pnpm typecheck               # tsc --noEmit across all packages
pnpm test                    # vitest run across all packages
pnpm gen:types               # regenerate core types from spec/openapi.yaml (run after editing the spec)
pnpm data:validate           # validate spec/data/*.csv (ids, provenance, freshness coverage)
pnpm dev                     # wrangler dev for the Worker
```

Per-package and single tests (the Worker suite runs in the Cloudflare workers pool, so it is slow):

```bash
pnpm --filter @itafika/worker test                       # one package's suite
pnpm --filter @itafika/core exec vitest run tests/quote.test.ts   # one file
pnpm --filter @itafika/worker exec vitest run -t "books through the provider adapter"  # one test by name
```

Local D1 + deploy (Worker package; see `docs/deploy-worker.md` — follow it, do not improvise against remote infra):

```bash
pnpm --filter @itafika/worker db:migrate:local   # apply migrations/ to local D1
pnpm --filter @itafika/worker db:seed:local      # build seed.sql from spec/data and load it
pnpm --filter @itafika/worker db:migrate:remote  # same, against remote D1
pnpm --filter @itafika/worker db:seed:remote
pnpm --filter @itafika/worker run deploy          # wrangler deploy
```

## Architecture

**The seven Phase 1 endpoints** (full contract in `spec/openapi.yaml`):
`GET /v1/zones`, `GET /v1/zones/search`, `GET /v1/freshness`, `POST /v1/quotes`, `POST /v1/deliveries`, `GET /v1/deliveries/{tracking_id}/track`, `POST /v1/deliveries/{tracking_id}/events`. The heart is `POST /v1/quotes`. (The booking resource is **delivery**, not "shipment" — renamed in ADR 0006.)

**Core engine + adapters pattern** (`spec/adapter-contract.md`): the routing engine contains **no provider-specific logic**. It calls every provider through one interface, `LogisticsProviderInterface` (`quote()` / `book()` / optional `track()`), collects answers, and returns them. Adding a provider = writing one adapter; you never touch the core. Three adapter kinds, same interface: **static** (reads `spec/data/`, the Phase 1 default and only one implemented), **live** (calls a real provider system, falls back to static), and **human-in-the-loop** (e.g. WhatsApp to a rider/parcel desk).

**Runtime is wired through adapters** (ADRs 0013–0015). The Worker's quote and booking paths build one `StaticRateAdapter` per provider from D1 data and go through `aggregateQuotes()` / `adapter.book()` — not a flat DB scan. When touching quote/booking logic, preserve this seam; do not reintroduce provider logic into the core or the Worker services.

**Adapter conformance rules that affect correctness:** `quote()` returns `null` for unserved routes (never a misleading price); the aggregator isolates each adapter's failures (a throwing adapter must not break others' quotes); map only to the five universal tracking statuses (never invent a sixth); costs are integers in KES.

**Tracking is one event log, many producers** (ADR 0015): `tracking_events` is append-only, current status = latest event, advances are forward-only (`canAdvanceTrackingStatus`). Booking, manual/internal updates, and future adapter/webhook updates all append through that same guard, each tagged with an internal `source`. Manual updates are the Phase-1 source of truth.

**Internal-only columns:** `quotes.provider_id`, `deliveries.provider_ref`, and `tracking_events.source` exist in D1 to drive the runtime but are deliberately **never** in API responses — exposing one is an additive API change needing a spec edit + ADR.

**The dataset is the asset** (`spec/data/`, schema in `spec/data/SCHEMA.md`): three CSVs — `zones.csv`, `providers.csv`, `rates.csv` (one row per provider+origin+destination), plus `freshness.csv`. Conventions that matter: IDs are forever (never reused/repurposed — retire instead); zone IDs follow `ZONE_<TOWN>_<KIND>_<NN>` (e.g. `ZONE_NBI_CBD_01`); A→B and B→A are separate rows (return rates differ). CSV is canonical; the Worker loads it into D1 (via `seed:build` → `seed.sql`) as a queryable projection.

**Phase 1 quote math** (`spec/data/SCHEMA.md`, implemented in `@itafika/core`): `estimated_cost_kes = base_cost_kes + ceil(package_weight_kg) * cost_per_kg_kes`, rounded to nearest 10 KES; a rate applies only if `package_weight_kg <= max_weight_kg` (when set).

## Reference-implementation stack

TypeScript on Cloudflare Workers (ADRs 0001–0003). Worker boundaries (ADR 0009): thin HTTP layer in `src/index.ts`, request shape checks in `src/validation.ts`, ID/TTL rules in `src/policy.ts`, business logic in `*-service.ts`, all D1 access in `src/db.ts`. Use Cloudflare primitives deliberately, not by default: **Workers** for the HTTP API, **D1** for zones/providers/rates/deliveries/tracking events, and later **Queues** (background jobs, webhooks), **Workflows** (durable booking, provider retries), **Durable Objects** (single-authority coordination) — none of which Phase 1 uses yet. Schema changes are D1 migrations in `packages/worker/migrations/` (sequential `NNNN_name.sql`).

## Governance

`spec/` changes need a non-author maintainer's sign-off; breaking changes need steward sign-off plus a deprecation plan. Everyday changes (data, adapters, docs, fixes) are merge-on-review. Decisions are recorded as ADRs in `docs/decisions/` (indexed in its `README.md`) and can be superseded by later ADRs.

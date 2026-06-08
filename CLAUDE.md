# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Itafika is an open-source logistics aggregator API for Kenya — a single interface for quoting and booking delivery across riders, matatu/bus SACCOs, and national couriers, with Kenyan locations modelled as **zones/stages** rather than street addresses.

Critically, this is a **spec-first standard, not just an app**. `spec/` defines what Itafika *is* in a language-agnostic way; `packages/` is intended to be one correct (Cloudflare/TypeScript) reference implementation of that standard. Anyone could reimplement Itafika in another language from `spec/` alone.

## Current state (read before assuming files exist)

The repo is **Phase 1, pre-release**. Only `spec/` and `docs/` are populated. The `packages/` reference implementation (`core/`, `adapters/`, `worker/`) and `examples/` described in the README and ADRs **do not exist yet** — they are the planned structure, not the current tree. Verify a path exists before referencing it; do not invent build/test commands for code that isn't there. The README's quickstart (`pnpm --filter @itafika/worker dev`) is aspirational until `packages/worker` is created.

## The spec-first rule (most important workflow constraint)

**The spec leads. Code follows.** This is enforced, not a guideline:

- Any change to the API surface (endpoints, fields, types, tracking states) or the adapter contract starts in `spec/` first — `spec/openapi.yaml` or `spec/adapter-contract.md` — **then** the implementation. Implementation-only changes that contradict the spec get bounced back to fix the spec.
- Such spec changes also require a short ADR in `docs/decisions/` (problem → options → choice) per `GOVERNANCE.md`.
- Data changes start in `spec/data/*.csv` and **must include provenance** (the `source` column / PR description explaining how the rate is known).
- The API is versioned by path (`/v1`). Within a major version, changes are additive/backwards-compatible only; breaking changes go to the next major with a deprecation window.

When generating implementation code, derive TypeScript types from `spec/openapi.yaml` rather than hand-writing them — keeping Worker, core engine, and adapters aligned with the contract is the whole point of the split.

## Architecture

**The five Phase 1 endpoints** (full contract in `spec/openapi.yaml`):
`GET /v1/zones`, `GET /v1/zones/search`, `POST /v1/quotes`, `POST /v1/shipments`, `GET /v1/shipments/{tracking_id}/track`. The heart is `POST /v1/quotes`.

**Core engine + adapters pattern** (`spec/adapter-contract.md`): the Core Routing Engine contains **no provider-specific logic**. It calls every provider through one interface, `LogisticsProviderInterface` (`quote()` / `book()` / optional `track()`), collects answers, and returns them. Adding a provider = writing one adapter; you never touch the core. Three adapter kinds, same interface: **static** (reads `spec/data/`, the Phase 1 default), **live** (calls a real provider system, falls back to static), and **human-in-the-loop** (e.g. WhatsApp to a rider/parcel desk).

**Adapter conformance rules that affect correctness:** `quote()` returns `null` for unserved routes (never a misleading price); map only to the five universal tracking statuses (never invent a sixth); costs are integers in KES; live adapters must fail soft (fall back or return null, never throw in a way that breaks other providers' quotes).

**The dataset is the asset** (`spec/data/`, schema in `spec/data/SCHEMA.md`): three CSVs — `zones.csv`, `providers.csv`, `rates.csv` (one row per provider+origin+destination), plus `freshness.csv`. Conventions that matter: IDs are forever (never reused/repurposed — retire instead); zone IDs follow `ZONE_<TOWN>_<KIND>_<NN>` (e.g. `ZONE_NBI_CBD_01`); A→B and B→A are separate rows (return rates differ). CSV is canonical; the reference Worker loads it into D1 as a queryable projection.

**Phase 1 quote math** (`spec/data/SCHEMA.md`): `estimated_cost_kes = base_cost_kes + ceil(package_weight_kg) * cost_per_kg_kes`, rounded to nearest 10 KES; a rate applies only if `package_weight_kg <= max_weight_kg` (when set).

## Reference-implementation stack (for `packages/` when built)

TypeScript on Cloudflare Workers (ADRs 0001–0003). Use Cloudflare primitives deliberately, not by default: **Workers** for the HTTP API, **D1** for zones/providers/rates/shipments/tracking events, **Queues** for background jobs (webhooks, rate refreshes), **Workflows** for durable multi-step flows (booking, retries, payment/settlement), **Durable Objects** only when one shipment/provider/stream needs a single authority. Phase 1 stays simple: a Worker reading seeded D1. Tooling: Node.js >= 20, pnpm, Wrangler (for dev, D1 migrations, seeding from `spec/data/*.csv`, and deploy).

## Governance

`spec/` changes need a non-author maintainer's sign-off; breaking changes need steward sign-off plus a deprecation plan. Everyday changes (data, adapters, docs, fixes) are merge-on-review. Decisions are recorded as ADRs in `docs/decisions/` and can be superseded by later ADRs.

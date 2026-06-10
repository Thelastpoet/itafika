# ADR 0002 — Use a spec-first monorepo structure

**Status:** Accepted
**Date:** 2026-06-08

## Context

Itafika is an open standard, not just a service. Anyone should be able to build their own version using only the spec and data. A monorepo helps keep the spec and the reference implementation in sync.

## Decision

The project is a **spec-first monorepo** with two main parts:

```
spec/        Authoritative standard (language-agnostic)
  openapi.yaml         API contract
  adapter-contract.md  Rules for provider adapters
  data/                Open zones and rates dataset

packages/    TypeScript reference implementation
  core/      Quote engine and shared logic
  adapters/  Provider adapters
  worker/    Cloudflare Worker exposing the API
```

`spec/` is authoritative. `packages/` is a correct implementation of the standard, not the definition of the standard.

## Rationale

- **The standard stays portable.** Any team can reimplement Itafika in another language from `spec/`.
- **The implementation stays honest.** Generated types from `spec/openapi.yaml` keep the Worker, core engine, and adapters aligned with the API contract.
- **The data remains reviewable.** Zones, providers, rates, and freshness metadata live in `spec/data/` as human-editable CSV files.
- **Contributors have one place to work.** API contracts, seed data, implementation, examples, and ADRs live together.

## Consequences

- API changes start in `spec/openapi.yaml`, then flow to generated types and implementation code.
- Data changes start in `spec/data/` and include provenance.
- The Worker may project `spec/data/` into D1 for fast queries, but the CSV files remain the canonical source for reviewed seed data.
- Conformance tests should validate that any implementation behaves according to `spec/`.

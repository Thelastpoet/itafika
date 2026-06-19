# ADR 0002 — Use a spec-first monorepo structure

**Status:** Accepted; data-source portions superseded by [ADR 0023](0023-data-lives-in-d1-not-git.md)
**Date:** 2026-06-08

**Current authority:** `spec/` remains the public contract boundary. ADR 0023 makes D1
the operational source of truth for reference data; `spec/data/` is the seed and public
snapshot schema.

## Context

Itafika is an open standard, not just a service. Anyone should be able to build their own version using only the spec and data. A monorepo helps keep the spec and the reference implementation in sync.

## Decision

The project is a **spec-first monorepo** with two main parts:

```
spec/        Authoritative standard (language-agnostic)
  openapi.yaml         API contract
  adapter-contract.md  Rules for provider adapters
  data/                Reference-data seed and public snapshot schema

packages/    TypeScript reference implementation
  core/      Quote engine and shared logic
  adapters/  Provider adapters
  worker/    Cloudflare Worker exposing the API
```

`spec/` is authoritative. `packages/` is a correct implementation of the standard, not the definition of the standard.

## Rationale

- **The standard stays portable.** Any team can reimplement Itafika in another language from `spec/`.
- **The implementation stays honest.** Generated types from `spec/openapi.yaml` keep the Worker, core engine, and adapters aligned with the API contract.
- **The reference data remains reviewable.** Zones, providers, rates, and freshness
  metadata have a portable seed/export format in `spec/data/`; operational updates live
  in D1 under ADR 0023.
- **Contributors have one place to work.** API contracts, seed data, implementation, examples, and ADRs live together.

## Consequences

- API changes start in `spec/openapi.yaml`, then flow to generated types and implementation code.
- Reference-data contract changes start in `spec/data/` and include provenance rules.
- The Worker reads D1 for operational reference data. `spec/data/` remains the seed and
  generated public snapshot format, not the operational store.
- Conformance tests should validate that any implementation behaves according to `spec/`.

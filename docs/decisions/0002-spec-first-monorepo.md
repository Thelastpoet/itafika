# ADR 0002 — Spec-first, clearly separated monorepo

**Status:** Accepted
**Date:** 2026-06-08

## Context

Itafika is an open standard for representing and quoting Kenyan delivery, not only one hosted service. Someone should be able to build a conformant implementation from the published contract and dataset alone.

At the same time, a standard is easier to adopt when there is a working reference implementation people can run, inspect, and contribute to.

## Decision

The repository is a **single spec-first monorepo** with two clear layers:

```
spec/        canonical, language-agnostic standard
  openapi.yaml         API contract
  adapter-contract.md  provider adapter contract
  data/                open zones + rates dataset

packages/    TypeScript reference implementation
  core/      quote engine + shared domain logic
  adapters/  provider adapters
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

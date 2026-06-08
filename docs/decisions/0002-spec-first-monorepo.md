# ADR 0002 — Spec-first, clearly separated monorepo

**Status:** Accepted
**Date:** 2026-06-08

## Context

Itafika positions itself as an *open standard* for representing and quoting Kenyan delivery — the GTFS or OpenStreetMap of parcel logistics — not as a single company's product. For that positioning to be real, the **standard must be separable from any one implementation.** Someone should be able to reimplement Itafika in another language from the published artifacts alone.

At the same time, a standard with no running code is hard to adopt. We need a reference implementation people can actually call.

## Decision

A **single monorepo** containing two clearly separated layers:

```
spec/        ★ the canonical, language-agnostic standard
  openapi.yaml         the API contract (source of truth)
  adapter-contract.md  the provider adapter contract
  data/                the open zones + rates dataset (+ schema)

packages/    the TypeScript reference implementation
  core/      routing engine + types generated from spec/openapi.yaml
  adapters/  provider adapters implementing the adapter contract
  server/    Fastify HTTP server exposing the contract
```

`spec/` is **authoritative**. `packages/` is **a** correct implementation of it, not *the definition* of it.

## Rationale

- **Standard ≠ implementation.** Keeping the contract and dataset in a language-neutral `spec/` lets anyone build a conformant server in Go, Python, Rust, etc. That is the whole "open standard" claim, made structural.
- **One repo, not many.** A monorepo keeps the spec and the reference implementation versioned together and visible in one place, which lowers the contribution barrier versus coordinating across repos. The *separation* is by directory and package boundary, not by repository.
- **Generated types enforce the boundary.** The server and adapters consume types generated from `spec/openapi.yaml`. The compiler enforces that the implementation matches the standard.

## Consequences

- Every contract change starts in `spec/` and flows outward (codified in [CONTRIBUTING.md](../../CONTRIBUTING.md) and [GOVERNANCE.md](../../GOVERNANCE.md)). Server-only changes that contradict the spec are rejected in favour of fixing the spec.
- A type-generation step sits between `spec/openapi.yaml` and `packages/`. This is build tooling we commit to maintaining.
- The dataset lives in `spec/data/` rather than inside the server, signalling that the data is part of the open standard, not an implementation detail.
- Conformance tests (later) validate any implementation against `spec/`, so "is this a real Itafika server?" has an objective answer.

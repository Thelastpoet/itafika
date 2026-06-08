# ADR 0001 — Language and stack for the reference implementation

**Status:** Accepted
**Date:** 2026-06-08

## Context

Itafika's strategy depends on outside contributors writing **adapters** for providers, and on a broad community maintaining the open dataset. The reference implementation's language therefore has to optimise for one thing above all: **how many Kenyan / African developers can comfortably contribute an adapter**, while keeping the spec and the server from drifting apart.

The original blueprint suggested Go for "high concurrency and performance." That instinct is worth examining rather than accepting by default.

A logistics aggregator that fans out to a handful of provider APIs is **I/O-bound** (waiting on external endpoints), not CPU-bound. Raw compute performance is not the constraint at any realistic near-term scale; contributor accessibility and spec/implementation fidelity are.

## Options considered

**Go** — single binary, excellent concurrency, strong performance.
Rejected as the *primary* language: it solves a performance problem Itafika does not yet have, at the cost of the thing it can't afford to lose — a low barrier to casual adapter contributions. The regional Go pool is smaller, and the ceremony for a quick "wire up my local courier" contribution is higher. (Nothing stops a contributor reimplementing the spec in Go — that's the point of spec-first.)

**Python + FastAPI** — huge talent pool, very readable, auto-generated docs.
Rejected: FastAPI generates the OpenAPI spec *from the code*, which works against the spec-first decision (ADR 0002). We would lose the ability to treat the contract as the language-agnostic source of truth and to share generated types between spec and server.

**TypeScript + Node** — **chosen.**

## Decision

The reference implementation is **TypeScript on Node.js**, using:

- **Fastify** — fast, schema-first HTTP server with first-class JSON Schema validation that pairs naturally with our OpenAPI contract.
- **Types generated from `spec/openapi.yaml`** — the contract is the source of truth; the server, core, and every adapter compile against generated types, so they cannot silently diverge from the spec.
- **pnpm workspaces** — monorepo package management (see ADR 0002).

## Rationale

1. **Largest accessible contributor pool** for web/JSON work in the target community; JSON is the native data model.
2. **Spec/implementation fidelity** — generating types from the OpenAPI contract means a broken contract is a compile error, across the server and all adapters. This directly serves the "clearly separated" goal of ADR 0002.
3. **One language across the surface** — spec types, engine, and adapters share a language, lowering the cognitive cost of contributing an adapter.
4. **Concurrency is sufficient** — Node's async I/O comfortably handles fan-out to provider APIs.

## Consequences

- Contributors need Node ≥ 20 and pnpm. This is a near-universal toolchain in the web community.
- We accept that raw throughput is lower than Go. If a future bottleneck demands it, the hot path can be reimplemented against the same spec without changing the standard.
- TypeScript's type system becomes a guardrail for the adapter contract, which we lean on deliberately in [`spec/adapter-contract.md`](../../spec/adapter-contract.md).

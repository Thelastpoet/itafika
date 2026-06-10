# ADR 0009 — Organize Worker code by service boundaries

**Status:** Accepted
**Date:** 2026-06-08

## Context

The Cloudflare Worker code was becoming messy, with too many responsibilities (routing, validation, and database queries) mixed together in the same files.

## Decision

We will organize the Worker code into clear modules:

- `index.ts`: HTTP routing and response shaping.
- `validation.ts`: Parsing and validating requests.
- `policy.ts`: Local settings like ID formats and quote expiry times.
- `*-service.ts`: Business logic and coordination.
- `db.ts`: Database queries and data mapping.

## Rejected options

### Keep all Worker logic in `index.ts`

Rejected because it hides ownership and makes small convenience choices accumulate into architectural drift.

### Move all policy into `packages/core`

Rejected because not every Worker rule is reusable domain logic. Some rules are interface-local or operational and do not belong in the shared core package.

### Let the database layer own timestamps and identifier generation

Rejected because these are application concerns, not persistence concerns. Keeping them in the DB layer makes lifecycle behavior harder to reason about and test.

## Consequences

Positive:

- route handlers stay smaller and easier to review
- policy ownership is explicit
- persistence logic is narrower
- future contributors have a clearer place to extend behavior

Tradeoffs:

- more files
- slightly more indirection when tracing a request flow

That tradeoff is acceptable because the project is intended to grow and accept outside contributions.

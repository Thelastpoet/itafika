# ADR 0009: Define Worker Policy, Validation, and Service Boundaries

- Status: Accepted
- Date: 2026-06-08

## Context

The reference Worker had started to collect several concerns in the same files:

- HTTP route matching
- request validation
- quote and delivery orchestration
- quote expiry policy
- identifier generation
- persistence queries

That shape worked for the first implementation pass, but it created drift risk:

- policy choices were harder to find
- responsibilities were mixed
- tests covered behavior without making ownership clear
- future contributors would have to infer boundaries from code structure instead of reading a decision

This was already showing up in review feedback about scale, separation of concerns, and hidden implementation rules.

## Decision

The reference Worker will keep the following boundaries:

- `packages/worker/src/index.ts`
  - owns HTTP route matching and HTTP response shaping only
- `packages/worker/src/validation.ts`
  - owns request parsing and validation helpers for the Worker interface
- `packages/worker/src/policy.ts`
  - owns explicit implementation-local policy such as identifier format helpers and quote expiry timing
- `packages/worker/src/*-service.ts`
  - owns orchestration across validation, persistence, and domain logic
- `packages/worker/src/db.ts`
  - owns persistence queries and row-to-type mapping
  - does not generate business identifiers or current timestamps on its own

Implementation-local policy may live in the Worker when it is not part of the public contract, but it must be explicit and isolated in a clearly named module.

If a rule becomes contractual, data-driven, or adapter-specific later, it should move to the correct layer instead of expanding the Worker boundary.

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

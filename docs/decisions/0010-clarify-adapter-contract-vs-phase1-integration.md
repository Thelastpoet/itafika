# ADR 0010: Clarify Adapter Contract Versus Phase 1 Runtime Integration

- Status: Accepted
- Date: 2026-06-08

## Context

The repository now contains a real `@itafika/adapters` package and a canonical adapter contract in `spec/adapter-contract.md`.

At the same time, the Phase 1 reference Worker still computes quotes directly from the seeded dataset and records bookings without dispatching them through adapter instances.

That created a documentation problem:

- the adapter contract is real
- the extension direction is real
- but some prose described the runtime as if full adapter fan-out was already in place

For an open-source project, that ambiguity is costly. Contributors need to know whether something is:

- implemented now
- contractually defined
- or planned integration work

## Decision

We will keep the adapter contract as part of the canonical standard, but we will explicitly distinguish it from the current Phase 1 runtime wiring.

Documentation should say:

- the adapter interface is stable enough to contribute against
- the reference adapter package exists
- full Worker fan-out through adapters is still follow-on integration work

The OpenAPI and adapter-contract prose should avoid implying that the current reference Worker already dispatches every quote and booking through live adapter instances.

## Rejected options

### Remove the adapter contract until runtime fan-out is complete

Rejected because the contract is useful now for extension design, review, and contributor alignment.

### Keep the current prose and rely on status docs to clarify it

Rejected because the canonical spec and contract must not overstate what the reference implementation already does.

## Consequences

Positive:

- contributors can distinguish contract from implementation stage
- the adapter package remains a valid extension target
- the spec stays honest about Phase 1 behavior

Tradeoffs:

- some prose becomes more careful and less visionary

That tradeoff is correct because canonical docs must optimize for truth first.

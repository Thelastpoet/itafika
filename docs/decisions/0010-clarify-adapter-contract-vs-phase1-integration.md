# ADR 0010 — Define how adapters and the Worker interact

**Status:** Accepted
**Date:** 2026-06-08

## Context

We have a plan for "adapters" that connect to different delivery providers, but the current Worker still uses static data for quotes and bookings. This can be confusing for contributors who see the adapter code but don't see it used in the API.

## Decision

We will clearly state that while the adapter contract is ready, the Worker doesn't yet use them for every request. We will distinguish between what is "contractually defined" (the standard) and what is "actually implemented" (the Worker).

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

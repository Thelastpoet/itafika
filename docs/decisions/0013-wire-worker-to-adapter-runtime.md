# ADR 0013: Wire the Worker to the Adapter Runtime for Quotes

- Status: Accepted
- Date: 2026-06-09

## Context

The repository already contains three relevant pieces:

- a shared quote engine in `@itafika/core`
- a reference adapter package in `@itafika/adapters`
- a Worker quote path that reads D1 directly and never calls the adapter interface

That leaves the most important architectural seam unproven in runtime code. The Worker, core, and adapters are meant to align through `LogisticsProviderInterface`, but the quote flow still bypasses it completely.

## Decision

Use the adapter runtime as the quote execution path in the reference Worker.

For Stage 1:

- keep cost calculation helpers in `@itafika/core`
- build one static adapter per provider from the D1-loaded dataset
- aggregate provider quotes through `LogisticsProviderInterface`
- keep the output ordering identical to the current cheapest-first, reliability-tiebreak behavior

This change is limited to the quote flow. It does not yet wire booking or tracking updates through adapters.

## Rejected options

### Keep the flat quote path and leave adapters unused

Rejected because it keeps the key architecture split nominal instead of real.

### Move the whole quote engine into adapters immediately

Rejected because the cost helpers are still shared reusable mechanism and do not need to leave `@itafika/core`.

### Keep quote execution in core and only use adapters later for booking

Rejected because quoting is the simplest place to prove the seam first. It has lower operational risk than booking.

## Consequences

Positive:

- request → adapter interface → response becomes the real quote path
- the Worker/runtime split matches the project architecture more closely
- future booking and tracking integration has a live seam to build on

Tradeoffs:

- more runtime indirection in the quote path
- the static adapter becomes part of the critical request flow

That tradeoff is acceptable because proving the seam is the point of this stage.

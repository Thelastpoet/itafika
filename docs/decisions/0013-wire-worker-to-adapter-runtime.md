# ADR 0013: Connect the Worker to adapters for quotes

**Status:** Accepted
**Date:** 2026-06-09

## Context

We have code for "adapters" that connect to different delivery providers, but our Worker was still calculating quotes directly from the database. We need to use the adapter interface so the code matches our planned architecture.

## Decision

The Worker will now use the adapter system to get quotes. We will create "static adapters" that read data from the database. This ensures every quote goes through the same standard interface, even if the data behind it is static for now.

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

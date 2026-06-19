# ADR 0022 — Itafika builds the provider-side digital layer where none exists

**Status:** Accepted
**Date:** 2026-06-15

## Context

Phase 2 was originally framed as "connect Itafika to live provider adapters and
their online APIs." Field reality contradicts that framing. Most Kenyan delivery
providers — matatu SACCOs, bus parcel desks, boda riders — have no API and no
software at all; they take parcels by phone, at a desk, or over WhatsApp. The few
national couriers that *do* have APIs (e.g. Posta) are precisely the segment that
needs an aggregator least.

You cannot aggregate a supply that has no digital existence. So the original Phase 2
plan was waiting for an integration surface that, for the bulk of the market, will
never appear on its own.

## Decision

Itafika builds the **minimal provider-side digital layer itself**, as the means of
giving the aggregation something real to aggregate. This is the **manual /
human-in-the-loop adapter** from [`spec/adapter-contract.md`](../../spec/adapter-contract.md),
made good: a provider receives a booking and confirms it (e.g. "Accept" on a simple
surface), and that confirmation becomes the adapter's `book()` result and the first
tracking event.

Providers reach Itafika through **two on-ramps, same destination:**

- **Non-technical (most providers).** A hosted Itafika tool: the provider uploads its
  routes and rates (data) and receives and confirms bookings (operations).
- **Technical (has a system/devs).** Implement the open adapter contract directly, or
  self-host Itafika.

The core mission is **unchanged**: Itafika is a delivery orchestration API/control
plane for ecommerce checkout — one API call, all the delivery options and provider
handoff state. The provider tool produces what the orchestration API needs: real
provider supply, booking confirmation, and tracking events.

## Rationale

- **The supply side feeds the demand side.** Shops are the product; provider digitization
  is the means to have real supply behind the quotes shops already ask for.
- **It is already in the contract.** The manual adapter is one of the three adapter kinds.
  This is not a new architecture — it is the first serious implementation of an existing
  seam, plus a self-serve front door for people who cannot write code.
- **It meets providers where they are**, instead of waiting for an API that, for SACCOs
  and riders, is not coming.

## Rejected options

### Wait for / connect to provider APIs (the original Phase 2)

Rejected. For the bulk of the market there is no API to connect to, and there is no
credible path to one appearing. Building the first live adapter is still worthwhile but
is the *tail* of Phase 2, not its premise.

### Build broad provider operations software

Rejected as Phase 2 scope. The hosted provider surface stays focused on route/rate
submission, booking confirmation, and tracking updates. Broader provider operations
features require their own ADR.

## Consequences

- A new, separate provider-facing surface (not part of the clean read API; same boundary
  logic as [ADR 0009](0009-define-worker-boundaries.md)).
- The "first live adapter" work is explicitly reprioritized to the tail of Phase 2.
- The data this tool collects (provider-uploaded routes/rates, and booking
  confirmations) raises a data-architecture question and a legal one, addressed in
  [ADR 0023](0023-data-lives-in-d1-not-git.md) and
  [ADR 0024](0024-data-classification-and-protection.md).
- `docs/next-phase.md` must be rewritten so the next person does not re-inherit the
  "connect to APIs that don't exist" assumption.

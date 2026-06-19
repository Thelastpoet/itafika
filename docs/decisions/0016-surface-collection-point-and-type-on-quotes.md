# ADR 0016 — Show collection details on quotes

**Status:** Accepted (2026-06-10)
**Date:** 2026-06-09

## Context

In Kenya, most parcels are collected at an office or a "stage" (office pickup) rather than delivered to a door. Currently, our API doesn't show where or how a parcel will be collected, which makes it hard for a customer to choose an option at checkout.

## Decision

We will add collection details to the `Quote` response:

- **`collection_type`**: Either "office_pickup" or "door_delivery."
- **`collection_point`**: For office pickups, this shows the specific location (town and zone) where the customer can collect their parcel.

Both fields are **optional/additive** within `/v1`; existing required fields are
unchanged. The collection facts are a property *of the option*, not a separate
navigation step — this is what keeps the shop's UI free (see [0017](0017-add-delivery-options-discovery-surface.md)).

Reference data expectation: each rate record has a `collection_type` column per
provider+origin+destination row (see `spec/data/SCHEMA.md`). The collection point
for `office_pickup` is the row's destination zone.

## Rationale

- **Renderable choice.** A shop can finally show the one decision Kenyan customers
  must make — collect where, or delivered to door — without inventing data.
- **Itafika provides facts, not screens.** This adds *data* to the option; the
  funnel/list/picker UI stays the shop's (the agreed boundary).
- **Additive and honest.** Optional fields; no break to the `/v1` contract.

## Options considered

- **Leave the quote thin and let shops infer collection from `provider_type`.**
  Rejected — it forces every shop to re-encode "SACCOs are office pickup" by hand,
  which is exactly the per-shop reinvention Itafika exists to remove.
- **Model collection points only via `/v1/zones` and make shops join them.**
  Rejected — the join (which provider collects at which zone for this route) is the
  rate matrix's knowledge; the quote should state it.
- **Add a full address object for door delivery now.** Deferred — customer-specific
  address and handoff details belong in the shop-owned handoff flow defined by
  [0025](0025-delivery-orchestration-boundary.md); the quote only needs the
  `collection_type` distinction.

## Consequences

- The OpenAPI `Quote` schema gains `collection_type` and `collection_point`.
- The adapter contract's `ProviderQuote` gains the same fields (a conformant adapter
  must declare how its provider hands the parcel over).
- `rates.csv` gains a `collection_type` column; existing rows need backfill (data
  work, follow-on).
- Generated types and the reference Worker need updating (follow-on).

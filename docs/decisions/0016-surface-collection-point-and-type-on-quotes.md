# ADR 0016 — Surface collection point and collection type on quotes

**Status:** Accepted (2026-06-10)
**Date:** 2026-06-09

> One of four related ADRs (0016–0019) that set the direction for evolving Itafika
> from a pure quoting engine into a **checkout-delivery layer** a Kenyan shop can
> render directly. Direction and expectations only — implementation and the
> non-author maintainer sign-off required by [GOVERNANCE.md](../../GOVERNANCE.md)
> are follow-on, open to contribution.

## Context

The single most Kenya-specific fact about a delivery is **where, and how, the
recipient receives it**. Most parcels move office-to-office: the sender drops at a
SACCO/bus parcel desk and the recipient *collects* at that provider's office or
stage in their town. Riders and some couriers instead deliver to a door. A customer
at checkout cannot decide between options without knowing this.

Today the `Quote` schema carries `provider_type`, `provider_name`,
`estimated_cost_kes`, `estimated_time`, and `reliability_score` — and **nothing
about where or how the parcel is collected**. A shop therefore cannot render
"collect at 2NK, Nyeri town stage" or "delivered to your address" from Itafika
data, even though the rate matrix already knows the destination zone per provider.

This is a gap between what Itafika *provides* and what a checkout *needs*. It is the
highest-value of the four direction ADRs because the others build on it.

## Decision

Surface the collection facts the customer needs to choose, on the `Quote`:

- **`collection_type`** — a new enum `CollectionType`: `office_pickup | door_delivery`.
  Whether the recipient collects at the provider's office/stage, or the parcel is
  delivered to an address.
- **`collection_point`** — for `office_pickup`, the zone where the parcel is
  collected: `{ zone_id, name, town }`. Absent for `door_delivery` (the recipient's
  own address is the destination).

Both fields are **optional/additive** within `/v1`; existing required fields are
unchanged. The collection facts are a property *of the option*, not a separate
navigation step — this is what keeps the shop's UI free (see [0017](0017-add-delivery-options-discovery-surface.md)).

Data expectation: `rates.csv` gains a `collection_type` column per
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
- **Add a full address object for door delivery now.** Deferred — door addresses
  are the recipient's, captured at booking ([0018](0018-capture-delivery-instructions-and-collection-identity.md)); the quote only needs the
  `collection_type` distinction.

## Consequences

- The OpenAPI `Quote` schema gains `collection_type` and `collection_point`.
- The adapter contract's `ProviderQuote` gains the same fields (a conformant adapter
  must declare how its provider hands the parcel over).
- `rates.csv` gains a `collection_type` column; existing rows need backfill (data
  work, follow-on).
- Generated types and the reference Worker need updating (follow-on).

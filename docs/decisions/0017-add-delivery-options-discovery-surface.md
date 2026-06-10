# ADR 0017 — Add a delivery-options discovery surface

**Status:** Accepted (2026-06-10)
**Date:** 2026-06-09

> One of four related ADRs (0016–0019) evolving Itafika into a checkout-delivery
> layer. Direction and expectations only — implementation and maintainer sign-off
> per [GOVERNANCE.md](../../GOVERNANCE.md) are follow-on.

## Context

A real checkout lets the customer *explore* before committing: pick their area, see
which transport modes reach it, see which providers run those modes and where they
collect, then choose. Kenyan shoppers think brand- and place-first — "I'm going to
Nyeri, I'll use 2NK, to their town office."

But today the only way to learn *anything* from Itafika is `POST /v1/quotes`, which
**requires both exact zone IDs and a weight up front**. You cannot ask "what are my
options to Nyeri?" — you must already know the precise destination zone. There is no
way to browse by town/county or filter by mode. `GET /v1/zones/search` is name-only.

So the discovery half of a checkout — county → mode → provider → collection point —
cannot be built on Itafika data. The data exists in the rate matrix; the *navigation
surface* over it does not.

## Decision

Add a **read-only discovery endpoint** that exposes the navigable option tree
without requiring a weight or an exact destination zone:

```
GET /v1/options?origin_zone_id=...&destination_town=...&mode=...   (mode optional)
```

It returns, for the shop's origin into the customer's town, the providers that serve
that route grouped as **delivery options**, each carrying: `provider_name`,
`provider_type` (the mode), `reliability_score`, `collection_type`
([0016](0016-surface-collection-point-and-type-on-quotes.md)), the **collection points** (the zones in that town the provider serves),
and an indicative `from_cost_kes`.

Clear separation of concerns:

- **`/v1/options` = navigation.** No weight, no binding price. It answers "who can
  take this to Nyeri, in what mode, collected where, roughly from how much."
- **`POST /v1/quotes` = pricing.** Once the customer picks a collection point (which
  becomes the `destination_zone_id`) and the weight is known, the existing quote
  endpoint returns the exact, bookable price.

To support browsing by area, `Zone` gains an optional **`county`** field, and
`GET /v1/zones` gains `town` and `county` filters.

`provider_id` remains internal and is **not** exposed (consistent with the existing
internal-column rule); options are keyed to the customer by `provider_name`/type and
collection point, exactly as `Quote` is.

## Rationale

- **Closes the discovery gap** while keeping pricing where weight makes it correct.
- **Builds the funnel without owning it.** The endpoint returns the *tree* a shop
  needs for county → mode → provider → office; the shop still renders the screens.
- **Cheap and honest.** Navigation needs no pricing math, so it stays fast and
  doesn't pretend to a precision (weight-based cost) it doesn't have.

## Options considered

- **Overload `POST /v1/quotes` to accept a town and optional weight.** Rejected —
  conflates navigation and pricing, makes the quote's cost fields sometimes-binding
  and sometimes-indicative, and muddies caching.
- **Make shops call `/v1/quotes` across candidate zones to discover coverage.**
  Rejected — N calls to learn structure, and it needs a weight Itafika shouldn't
  require for browsing.
- **Expose `provider_id` to let shops build their own discovery.** Rejected —
  violates the internal-column rule and leaks routing internals.

## Consequences

- The OpenAPI contract gains `GET /v1/options`, a `DeliveryOption` schema, a
  `county` field on `Zone`, and `town`/`county` filters on `GET /v1/zones`.
- The adapter contract gains an **optional `coverage()`** method so an adapter can
  declare the towns/zones and collection points it serves; the static adapter
  derives it from the dataset. Adapters that don't implement it simply don't appear
  in discovery.
- `zones.csv` gains a `county` column (data work, follow-on).
- Generated types and the reference Worker need updating (follow-on).

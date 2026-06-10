# ADR 0017 — Add an endpoint to discover delivery options

**Status:** Accepted (2026-06-10)
**Date:** 2026-06-09

## Context

Currently, users have to provide an exact location and package weight just to see any options. This makes it hard for someone to "browse" which providers or transport modes (like "bus" or "shuttle") serve their town.

## Decision

Add a `GET /v1/options` endpoint. This allows users to see available providers and transport modes for a town without needing an exact address or weight. We've also added a **"county"** field to zones to make searching easier.

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

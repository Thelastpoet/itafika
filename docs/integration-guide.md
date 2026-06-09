# Integration Guide — Using Itafika in Your Checkout

This guide is for developers building an online shop who want to offer delivery at
checkout without modelling Kenya's logistics themselves. You make a few HTTP calls;
Itafika returns the delivery options, books the chosen one, and tracks it.

A complete, runnable version of everything below is in
[`examples/simple-shop`](../examples/simple-shop) — this guide walks through the same
flow step by step.

- **What Itafika gives you:** the delivery options between two locations for a package,
  each with a cost and an estimated time; a way to book one; and unified tracking.
- **What you still own:** your checkout UI and your order. Itafika is the delivery
  layer you plug in — it returns numbers and references for you to use.

## Base URL and auth

The hosted reference Worker is:

```
https://itafika-api.emcie4.workers.dev
```

There is no authentication yet — calls are open. (API keys for shops are planned; this
guide will be updated when they land.) The API is versioned by path (`/v1`); within a
major version, changes are additive and backwards-compatible.

All errors share one shape:

```json
{ "error": { "code": "invalid_request", "message": "human-readable detail" } }
```

## The flow

Four steps: resolve the location to a zone, get quotes, book the chosen quote, track it.

### 1. Resolve the customer's location to a zone

Kenyan delivery is described by **stages and hubs, not street addresses** — "the stage
behind the chemist" is a real drop-off. So origin and destination are *zone IDs*, not
addresses. Your shop knows its own pickup zone; resolve the customer's destination from
what they type with `GET /v1/zones/search?q=`:

```bash
curl "https://itafika-api.emcie4.workers.dev/v1/zones/search?q=Nakuru"
```

```json
{
  "zones": [
    { "id": "ZONE_NKR_MAIN", "name": "Nakuru Main Stage", "type": "stage", "town": "Nakuru" }
  ]
}
```

Show the matches as a dropdown and let the customer pick; keep the chosen `id`. Use
`GET /v1/zones` to list everything (optionally filtered by `type`).

### 2. Get delivery options

Send the origin zone, destination zone, and package weight to `POST /v1/quotes`:

```bash
curl -X POST https://itafika-api.emcie4.workers.dev/v1/quotes \
  -H 'content-type: application/json' \
  -d '{"origin_zone_id":"ZONE_NBI_CBD_01","destination_zone_id":"ZONE_NKR_MAIN","package_weight_kg":2.5}'
```

```json
{
  "origin_zone_id": "ZONE_NBI_CBD_01",
  "destination_zone_id": "ZONE_NKR_MAIN",
  "quotes": [
    {
      "quote_id": "qt_3eb593ca03cd42dcaa570780",
      "provider_type": "matatu_sacco",
      "provider_name": "Mololine Sacco",
      "estimated_cost_kes": 400,
      "estimated_time": "3 hours",
      "reliability_score": 0.98
    },
    {
      "quote_id": "qt_48ffc22da7444a61bc38b97d",
      "provider_type": "national_courier",
      "provider_name": "G4S Courier",
      "estimated_cost_kes": 770,
      "estimated_time": "next day",
      "reliability_score": 0.99
    }
  ]
}
```

Quotes come back cheapest-first. Each option:

| Field | Meaning |
|---|---|
| `quote_id` | Opaque ID you pass to booking. Single-use; expires after 24 hours. |
| `provider_type` | `boda_rider` \| `matatu_sacco` \| `bus` \| `national_courier` |
| `provider_name` | Display name for the customer |
| `estimated_cost_kes` | Delivery cost, an integer in KES |
| `estimated_time` | Human-readable estimate, e.g. `"45 mins"`, `"3 hours"`, `"next day"` |
| `reliability_score` | 0–1 confidence in on-time, intact delivery |

`package_type` (e.g. `"apparel"`) is an optional request field reserved for future
ranking; you can send it, but it does not change results today.

An **empty `quotes` array is a valid answer** — it means no provider serves that route
yet. Show "no options for this route" rather than treating it as an error.

### 3. Book the chosen quote

When the customer commits, book the `quote_id` with sender and recipient contacts via
`POST /v1/deliveries`:

```bash
curl -X POST https://itafika-api.emcie4.workers.dev/v1/deliveries \
  -H 'content-type: application/json' \
  -d '{
    "quote_id": "qt_3eb593ca03cd42dcaa570780",
    "sender":    { "name": "Asha Mwangi", "phone": "+254712345678" },
    "recipient": { "name": "John Otieno", "phone": "+254723456789" },
    "package_description": "Sealed apparel box, 2.5kg"
  }'
```

```json
{
  "tracking_id": "trk_85ddbd2f2a6b492b9db48f8eb2515ce4",
  "status": "package_picked",
  "quote": { "quote_id": "qt_3eb593ca03cd42dcaa570780", "provider_name": "Mololine Sacco", "...": "..." },
  "sender": { "name": "Asha Mwangi", "phone": "+254712345678" },
  "recipient": { "name": "John Otieno", "phone": "+254723456789" },
  "created_at": "2026-06-09T07:52:36.261Z"
}
```

Two rules to design around:

- **A quote is single-use** — booking the same `quote_id` twice returns `404`. Re-quote
  if you need a fresh one.
- **A quote expires after 24 hours** — booking an expired quote returns `404`. Quote
  near the moment of purchase, not hours ahead.

`phone` must be E.164 (`+254…`); `name` is 1–120 chars; `package_description` is
optional (≤500 chars). Keep the returned `tracking_id`.

### 4. Track the delivery

Poll `GET /v1/deliveries/{tracking_id}/track` to show the customer where the parcel is:

```bash
curl https://itafika-api.emcie4.workers.dev/v1/deliveries/trk_85ddbd2f2a6b492b9db48f8eb2515ce4/track
```

```json
{
  "tracking_id": "trk_85ddbd2f2a6b492b9db48f8eb2515ce4",
  "status": "package_picked",
  "history": [
    { "status": "package_picked", "at": "2026-06-09T07:52:36.261Z" }
  ]
}
```

`status` is the current state; `history` is the ordered event log. Every provider's own
states are normalized into the same **five universal statuses**:

| Status | Meaning |
|---|---|
| `package_picked` | Collected from the sender |
| `in_transit` | On the way |
| `at_sorting_hub` | At a sorting / transfer hub |
| `ready_for_pickup` | Arrived; awaiting recipient collection |
| `delivered` | Handed to the recipient |

Status only ever moves forward. You read tracking; you do not write it.

## Handling errors

Check the HTTP status and the `error.code`:

| Situation | Status | Notes |
|---|---|---|
| Malformed body / bad field (e.g. invalid phone) | `400` | `error.code: invalid_request` |
| Unknown zone in a quote request | `404` | Resolve zones via search first |
| Booking an unknown / expired / already-booked quote | `404` | Re-quote and book again |
| No provider serves the route | `200` | Empty `quotes` array — not an error |

## Customizing

Itafika is open source, so the defaults are a starting point, not a cage. A shop with
its own negotiated rate can override it; you can hide a mode or change how options are
ranked on your end — without rebuilding the foundation.

## Reference

- Runnable example: [`examples/simple-shop`](../examples/simple-shop)
- Full contract (every field, type, example): [`spec/openapi.yaml`](../spec/openapi.yaml)
- Current implementation status: [`docs/status.md`](status.md)

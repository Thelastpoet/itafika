# Integration Guide — Using Itafika in Your Checkout

This guide is for developers who want to add delivery orchestration to their online shop without rebuilding Kenyan route, stage, provider, and pricing knowledge. You make a few API calls, and Itafika returns checkout-ready delivery options, provider handoff state, and tracking state.

You can find a working example in [`examples/simple-shop`](../examples/simple-shop). This guide walks you through the flow step by step.

- **What Itafika gives you:** Delivery options between two locations, prices, estimated times, provider handoff state, and tracking state.
- **What your shop owns:** Checkout, orders, customer records, contact details, payment, and customer-specific handoff information.

## Base URL and Auth

You can use the live API here:

```
https://itafika-api.emcie4.workers.dev
```

Right now, there is no password or API key needed — anyone can use it. We are using version 1 of the API (`/v1`).

If something goes wrong, the API will return an error like this:

```json
{ "error": { "code": "invalid_request", "message": "details about what went wrong" } }
```

## How it works

There are four simple steps:

### 1. Find the customer's location

Delivery in Kenya often uses **stages and hubs rather than street addresses**. For example, a customer might want their parcel dropped at "the stage behind the chemist."

Itafika uses *zone IDs* to identify these locations. You can search for a location using `GET /v1/zones/search?q=`:

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

Show these matches to the customer in a dropdown and save the `id` of the one they pick.

### 2. Show delivery options and prices

Send the origin, destination, and package weight to `POST /v1/quotes`:

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

Quotes are shown with the cheapest options first. Each option includes:

| Field | Meaning |
|---|---|
| `quote_id` | Use this ID to book the delivery. It expires after 24 hours. |
| `provider_type` | The type of delivery (e.g., boda, matatu, courier). |
| `provider_name` | The name of the company to show the customer. |
| `estimated_cost_kes` | The price in Kenya Shillings. |
| `estimated_time` | How long it will take (e.g., "3 hours", "next day"). |
| `reliability_score` | A score from 0 to 1 showing how reliable this provider is. |

If the `quotes` list is empty, it means we don't have a provider for that route yet. You should show a "no delivery options" message to the customer.

### 3. Create the delivery orchestration record

When the customer confirms their order, create the delivery orchestration record using the selected `quote_id` and your shop's own order reference.

```bash
curl -X POST https://itafika-api.emcie4.workers.dev/v1/deliveries \
  -H 'content-type: application/json' \
  -d '{
    "quote_id": "qt_3eb593ca03cd42dcaa570780",
    "shop_order_ref": "ORDER-12345",
    "shop_handoff_url": "https://shop.example.com/delivery-handoff/ORDER-12345"
  }'
```

```json
{
  "tracking_id": "trk_85ddbd2f2a6b492b9db48f8eb2515ce4",
  "status": "booking_requested",
  ...
}
```

Two important rules:

- **A quote can only be used once.** If you try to book the same `quote_id` again, you will get an error.
- **A quote expires after 24 hours.** You should get the quote and book it close to the time of purchase.

Keep customer names, phone numbers, addresses, and order details in your shop system. The optional `shop_handoff_url` is your controlled provider handoff page or endpoint. Save the `tracking_id` returned by the API.

### 4. Track the parcel

Use `GET /v1/deliveries/{tracking_id}/track` to show delivery state in your shop:

```bash
curl https://itafika-api.emcie4.workers.dev/v1/deliveries/trk_85ddbd2f2a6b492b9db48f8eb2515ce4/track
```

```json
{
  "tracking_id": "trk_85ddbd2f2a6b492b9db48f8eb2515ce4",
  "status": "booking_requested",
  "history": [
    { "status": "booking_requested", "at": "2026-06-09T07:52:36.261Z" }
  ]
}
```

Delivery state uses one universal status flow:

| Status | Meaning |
|---|---|
| `booking_requested` | The shop selected a quote and requested provider handoff. |
| `booking_confirmed` | The provider accepted the booking. |
| `package_picked` | The parcel has entered the provider's delivery flow. |
| `in_transit` | The parcel is on its way. |
| `at_sorting_hub` | The parcel is at a sorting or transfer point. |
| `ready_for_pickup` | The parcel has arrived at the selected pickup point. |
| `delivered` | The provider marked the delivery complete. |
| `delivery_cancelled` | The provider handoff ended without an active delivery. |

## Handling errors

Check the HTTP status and the `error.code`:

| Situation | Status | Notes |
|---|---|---|
| Bad request | `400` | `error.code: invalid_request` |
| Unknown location ID | `404` | Use the search API to find the correct ID first. |
| Expired or already used quote | `404` | Get a new quote and book again. |
| No delivery options found | `200` | This is not an error. The `quotes` list will just be empty. |

## Customizing

Itafika is open source, so you can change how it works for your shop. You can use your own negotiated prices with couriers, hide certain delivery methods, or change how options are ranked. You get a strong foundation for free, and you can build exactly what you need on top of it.

## Reference

- Runnable example: [`examples/simple-shop`](../examples/simple-shop)
- Full contract (every field, type, example): [`spec/openapi.yaml`](../spec/openapi.yaml)
- Delivery orchestration boundary: [`docs/decisions/0025-delivery-orchestration-boundary.md`](decisions/0025-delivery-orchestration-boundary.md)
- Current implementation status: [`docs/status.md`](status.md)

# Integration Guide — Using Itafika in Your Checkout

This guide is for developers who want to add delivery to their online shop without having to figure out how Kenyan delivery works on their own. You make a few simple API calls, and Itafika handles the rest: showing delivery options, booking the chosen one, and tracking the parcel.

You can find a working example in [`examples/simple-shop`](../examples/simple-shop). This guide walks you through the flow step by step.

- **What Itafika gives you:** Delivery options between two locations, prices, estimated times, booking, and tracking.
- **What you still own:** Your shop's checkout page and your orders. Itafika is just the delivery layer you plug in.

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

### 3. Book the delivery

When the customer confirms their order, book the delivery using the `quote_id` and the contact details for the sender and recipient via `POST /v1/deliveries`:

```bash
curl -X POST https://itafika-api.emcie4.workers.dev/v1/deliveries \
  -H 'content-type: application/json' \
  -d '{
    "quote_id": "qt_3eb593ca03cd42dcaa570780",
    "sender":    { "name": "Asha Mwangi", "phone": "+254712345678" },
    "recipient": { "name": "John Otieno", "phone": "+254723456789" },
    "package_description": "Sealed box of clothes, 2.5kg"
  }'
```

```json
{
  "tracking_id": "trk_85ddbd2f2a6b492b9db48f8eb2515ce4",
  "status": "package_picked",
  ...
}
```

Two important rules:

- **A quote can only be used once.** If you try to book the same `quote_id` again, you will get an error.
- **A quote expires after 24 hours.** You should get the quote and book it close to the time of purchase.

The phone numbers must be in the format `+254…`. Save the `tracking_id` returned by the API.

### 4. Track the parcel

Use `GET /v1/deliveries/{tracking_id}/track` to show the customer where their parcel is:

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

Every delivery provider uses the same **five universal statuses**:

| Status | Meaning |
|---|---|
| `package_picked` | The parcel has been collected from the sender. |
| `in_transit` | The parcel is on its way. |
| `at_sorting_hub` | The parcel is at a sorting or transfer point. |
| `ready_for_pickup` | The parcel has arrived and is ready for the recipient to collect. |
| `delivered` | The parcel has been handed to the recipient. |

## Handling errors

Check the HTTP status and the `error.code`:

| Situation | Status | Notes |
|---|---|---|
| Bad request (e.g. wrong phone number) | `400` | `error.code: invalid_request` |
| Unknown location ID | `404` | Use the search API to find the correct ID first. |
| Expired or already used quote | `404` | Get a new quote and book again. |
| No delivery options found | `200` | This is not an error. The `quotes` list will just be empty. |

## Customizing

Itafika is open source, so you can change how it works for your shop. You can use your own negotiated prices with couriers, hide certain delivery methods, or change how options are ranked. You get a strong foundation for free, and you can build exactly what you need on top of it.

## Reference

- Runnable example: [`examples/simple-shop`](../examples/simple-shop)
- Full contract (every field, type, example): [`spec/openapi.yaml`](../spec/openapi.yaml)
- Current implementation status: [`docs/status.md`](status.md)

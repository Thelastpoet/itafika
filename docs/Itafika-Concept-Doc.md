# Itafika

### A delivery orchestration API/control plane for ecommerce checkout in Kenya

*"Itafika"* — Swahili, *it will arrive*.

Itafika gives online shops one API for delivery options, provider handoff, and tracking state. Locations, transport modes, providers, and rates are already built in so shop developers can focus on checkout.

---

## 1. The idea in short

Any online shop in Kenya can plug into Itafika to solve their delivery problems.

At checkout, a customer picks their location and sees real options to get their goods — a boda rider, a matatu or bus parcel service, or a national courier. Each option shows a price and an estimated time. The shop owns the customer and order data; Itafika returns the delivery facts and orchestration state the checkout needs.

**Delivery should be something you use, not something you have to build yourself.**

---

## 2. The problem we are solving

Online shopping in Kenya is growing fast, but delivery is often the hardest part. It's not because there aren't enough ways to move a parcel, but because there are too many and they don't work together.

A shop owner who wants to ship a 2kg box from Nairobi to Nyeri can use a boda rider, a matatu SACCO's parcel desk, a long-distance bus, or a national courier. Each has its own prices, its own coverage, and its own way of describing locations. Often, there is no software at all. Also, locations in Kenya don't always behave like street addresses. "Drop it at the stage behind the chemist" is a common and valid instruction that GPS doesn't handle well.

Right now, every developer in Kenya has to figure out delivery on their own, which is slow and difficult. They end up only using a few couriers and ignore cheaper options like matatus and buses because they are too hard to connect to.

Itafika does that work **once, for everyone.**

---

## 3. The goal: One delivery orchestration layer for checkout

Itafika acts as the control plane between shops and providers. A shop owner using Itafika can ask one question — *how can this package get from here to there, and what are the options?* — and get one clear answer.

Our job is to turn delivery routes, rates, provider availability, booking confirmation, and tracking state into a clean API for checkout.

---

## 4. What you get as a developer

Integrating Itafika into your shop is simple. You just ask for delivery options between two points, and Itafika returns a list you can show at checkout:

```json
POST /v1/quotes
{
  "origin_zone_id": "ZONE_NBI_CBD_01",
  "destination_zone_id": "ZONE_NKR_MAIN",
  "package_weight_kg": 2.5
}
```

```json
{
  "quotes": [
    {
      "quote_id": "qt_2mn41bq",
      "provider_type": "matatu_sacco",
      "provider_name": "Mololine Sacco",
      "estimated_cost_kes": 400,
      "estimated_time": "3 hours",
      "reliability_score": 0.98
    }
  ]
}
```

The customer picks one, and the shop keeps the order moving with a shop-owned reference. Itafika coordinates the selected provider, booking state, and tracking state.

Because Itafika is open source, you are never "locked in." You can use the default prices or add your own. You can hide certain delivery methods or change how options are ranked, all without rebuilding the whole system.

---

## 5. How we design Itafika

**Ready to use.** Out of the box, Itafika already knows the locations, the transport modes, and the rates. You get working delivery options on day one without having to add your own data.

**Works with any provider.** The core of Itafika doesn't care which courier is used. It talks to "adapters" that handle the specific details for each provider. Adding a new courier or matatu sacco is done at the edge, without changing the core system.

**Open and shared.** We believe the work of mapping Kenyan delivery should be done once and owned by the community, not locked inside a single company.

---

## 6. How it works

Itafika has two main parts: the **rules (the standard)** and a **working API**.

The **standard** defines the API design, how to connect new providers, and the open dataset. Anyone can use these rules to build their own version of Itafika.

The **working API** runs on Cloudflare. When it receives a request, it checks the database for locations and rates, finds the best options, and returns them to the shop.

We use an **Adapter Pattern**. This means the main system doesn't need to know how each courier works. Small "adapters" act as translators between Itafika and the physical delivery providers.

```
                  ┌───────────────────────────────┐
                  │      Shop / E-commerce        │
                  └───────────────┬───────────────┘
                                  │ API Call
                                  ▼
                  ┌───────────────────────────────┐
                  │      Itafika Core Engine      │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Rider Adapter  │      │  Matatu Adapter │      │ Courier Adapter │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         ▼                        ▼                        ▼
  (Bolt / Boda / …)      (2NK / Mololine / …)    (G4S / Wells Fargo / …)
```

This way, the community can keep adding new providers over time without breaking the core system.

We use Cloudflare tools to handle different parts of the process:

| Need | Tool used |
|------|-----------|
| Public API | Cloudflare Workers |
| Locations, rates, and tracking | D1 Database |
| Background tasks | Queues |
| Retries and long flows | Workflows |

Phase 1 is simple and only uses the Worker and the Database. The other tools are added as we need more advanced features.

---

## 7. Main features and API endpoints

Itafika is built from four main parts. We've designed them to be stable so you can build your shop with confidence.

**A. Locations and Zones.** Since delivery in Kenya uses stages and hubs rather than street addresses, we keep a database of these locations. Each one has a simple ID you can use.

```
GET /v1/zones                 List all drop-off / pick-up locations
GET /v1/zones/search?q=cbd    Search for a location
```

**B. Delivery Quotes.** This is the heart of the product. You give it the origin, destination, and weight, and it shows you every available delivery option with price and time.

```
POST /v1/quotes
```

**C. Booking orchestration.** Once your customer picks an option, this part records the shop reference, selected provider, and tracking ID.

```
POST /v1/deliveries
```

**D. Tracking.** Different providers track differently. Itafika turns all their updates into five simple states: `package_picked`, `in_transit`, `at_sorting_hub`, `ready_for_pickup`, and `delivered`. You only have to learn one set of statuses.

```
GET /v1/deliveries/{tracking_id}/track
```

---

## 8. Our data model

We keep our data simple and clear so anyone can help improve it.

**Locations / Zones** — Names of stages and hubs, their type, and where they are located.

**Providers** — The companies and services that move parcels (riders, saccos, couriers).

**Rates** — This is the most valuable part. It lists the cost to move a parcel between any two zones for each provider.

This information is kept in simple files that anyone can edit. The API uses this data to give you accurate prices.

---

## 9. Roadmap

**Phase 1 — Basic API (MVP).** We start with the most common routes and rates for Nairobi and other major towns. We've built the API to give useful quotes from this data right now. Even without live tracking for every provider, having standard locations and reliable price estimates is very useful for developers.

**Phase 2 — Growing the system.** We'll invite more people and providers to add towns, routes, rates, and provider details. Providers can use a hosted universal adapter surface for rates, booking confirmation, and tracking updates.

**Phase 3 — Getting better with time.** As more people use Itafika, we will have more data on which providers are the most reliable. We'll use this to improve our reliability scores and help customers pick the best options.

---

## 10. Why Itafika is different

Most providers in Kenya expose their rates and availability through their own phone,
desk, WhatsApp, or API workflows. Itafika gives developers one shared way to see
options from riders, matatus, buses, and couriers in one checkout flow.

Itafika is the shared delivery orchestration API/control plane for Kenyan ecommerce. By sharing the work of mapping routes, rates, providers, and handoff states, we make it easier for every online shop to offer delivery at checkout.

---

## 11. What's next?

This document explains our vision. Now we are focused on building it.

Our next steps:

- Make sure the Phase 1 API design is stable so you can start building.
- Add more locations and rates to our database.
- Improve our working API on Cloudflare.
- Help others connect more delivery providers to the system.

*Itafika — so that any shop can simply say: it will arrive.*

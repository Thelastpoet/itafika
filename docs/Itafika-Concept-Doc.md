# Itafika

### An open-source logistics aggregator API for Kenya

*"Itafika"* — Swahili, *it will arrive*.

A single, clean, predictable interface that any online shop can plug into to solve delivery and shipping — locations, transport modes, and rates already built in, so no developer has to model Kenya's delivery system from the ground up.

---

## 1. The idea, in one breath

Any online shop in Kenya plugs into Itafika and their delivery problem is sorted.

At checkout, their customer picks a location and sees real options for getting the goods to them — a boda rider, a matatu or bus parcel service, a national courier — each with a price and an estimated time. The shop didn't build any of that. They didn't map a single stage, model a single rate, or integrate a single courier. They made one API call and got back a working set of delivery options.

That is the whole promise: **delivery as something you consume, not something you build.**

Everything else in this document — the architecture, the data model, the phased roadmap — exists in service of keeping that one experience simple for the shop while the system underneath stays honest about how messy Kenyan delivery actually is.

---

## 2. The problem we are abstracting away

Kenya's e-commerce is growing fast — roughly a billion-dollar market and climbing — but delivery remains the part that breaks the experience. The reason is not a shortage of ways to move a parcel. It is the opposite: there are too many, and none of them speak the same language.

A shop owner who wants to ship a 2kg box from Nairobi to Nyeri can use an independent boda rider, a matatu SACCO's parcel desk, a long-distance bus, or a national courier. Each has its own prices, its own coverage, its own idea of where a package gets dropped, and its own — usually nonexistent — software. Worse, locations themselves don't behave like addresses. "Drop it at the stage behind the chemist" is a real, common, and completely valid delivery instruction that no GPS pin captures cleanly.

The result is that every e-commerce builder in Kenya re-solves the same problem from scratch, badly, in isolation. They hardcode a couple of couriers, guess at rates, and leave the cheaper informal options — the matatu and bus parcel networks that millions of Kenyans actually use — off the table entirely, because wiring them up by hand is hopeless.

Itafika exists to make that work happen **once, in the open, for everyone.**

---

## 3. The principle: an infrastructure abstraction layer

The model is what Daraja did for payments. Before Daraja, touching M-Pesa meant wrestling with a fragmented, opaque system directly. Daraja put a clean, predictable interface in front of the mess, and an entire generation of fintech got built on top of it.

Itafika takes the same posture toward physical delivery. It is an **abstraction layer**: it hides a chaotic, fragmented physical system behind one consistent API. The shop that consumes it never has to know which SACCO serves which route, what a rider charges across town, or how a courier names its tracking states. It asks one question — *how can this package get from here to there, and what are the options?* — and gets one clean answer.

The job of the layer is translation: take the disorder of real Kenyan logistics and present it as something orderly, queryable, and standard.

---

## 4. What a developer actually gets

The experience for the shop is deliberately small. They ask for the delivery options between two points for a given package, and Itafika returns a structured list they can render straight into checkout:

```json
POST /v1/quotes
{
  "origin_zone_id": "ZONE_NBI_CBD_01",
  "destination_zone_id": "ZONE_NKR_MAIN",
  "package_weight_kg": 2.5,
  "package_type": "apparel"
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

The customer picks one. The shop is done. No mapping, no rate tables, no courier integrations — those already shipped inside Itafika.

And because Itafika is open source, the defaults are a **starting point, not a cage.** A shop with its own negotiated courier rate can override it. A shop that wants to add a mode, hide one, or change how options are ranked, can. They consume the sensible defaults and bend them to their own checkout — without ever rebuilding the foundation.

---

## 5. Design principles

**Batteries included.** Out of the box, Itafika already knows the locations, the transport modes, and the rates. A shop gets working delivery options on day one without seeding any data themselves.

**Provider-agnostic at the core.** The engine never contains logic for a specific courier. It speaks to a small set of adapters, and each adapter translates for its own world. Adding Bolt, or 2NK, or G4S is a contribution at the edge — never a change to the core.

**Customizable and forkable.** Defaults are meant to be overridden. Rates, modes, and ranking are all things a consumer can adjust on their end. Open source makes the foundation shared and the last mile yours.

**Open by mission, not by accident.** The fragmented work of representing Kenyan delivery should be done once and owned by the community that depends on it — not locked inside any one company.

---

## 6. Architecture

Itafika has two layers: the open standard and the hosted reference API.

The **standard** lives in `spec/`: the OpenAPI contract, the adapter contract, and the open dataset. This is the part any team can reimplement in another language.

The **reference API** runs on Cloudflare Workers. A Worker receives checkout requests, reads zones and rates from D1, asks the core quote engine for available options, and returns the same JSON shape defined in the OpenAPI contract.

Itafika also uses an **Adapter Pattern**. The Core Routing Engine handles every request in the same standardized way and never knows which physical provider will ultimately fulfill it. Small adapters translate the standard request into the language of each transport class.

```
                  ┌───────────────────────────────┐
                  │     E-commerce Client (Shop)  │
                  └───────────────┬───────────────┘
                                  │ JSON API
                                  ▼
                  ┌───────────────────────────────┐
                  │       Core Routing Engine     │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Rider Adapter  │      │  Matatu Adapter │      │ Courier Adapter │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         ▼                        ▼                        ▼
  (Bolt / Gatika / …)      (2NK / Mololine / …)    (G4S / Wells Fargo / …)
```

This is also the open-source strategy made structural. Itafika ships the contract — a `LogisticsProviderInterface` — and the community fills in providers over time. The core stays small and stable; coverage grows at the edges through contribution.

Cloudflare primitives map cleanly to the logistics lifecycle:

| Need | Primitive |
|------|-----------|
| Public API | Workers |
| Zones, providers, rates, shipments, tracking events | D1 |
| Webhook processing and background provider jobs | Queues |
| Booking retries, human confirmation, payment, settlement | Workflows |
| Per-shipment or per-provider coordination | Durable Objects |

The first release does not need every primitive at once. Phase 1 can be a Worker plus D1. The other pieces are introduced where the delivery lifecycle needs background work, retries, or stateful coordination.

---

## 7. Core modules and endpoints

Itafika is built from four modules. All four are part of the canonical spec from the start; in the earliest release some are intentionally static, but the shape is fixed so consumers can build against it with confidence.

**A. Location & Zone Mapping.** Because Kenyan delivery is described by stages and hubs, not street addresses, Itafika maintains a Zones & Stages database — CBD hubs (e.g. RNG Plaza, Veteran House), upcountry stages (e.g. Nyeri Stage, Eldoret Main Stage), and residential areas — each with a stable, human-readable ID.

```
GET /v1/zones                 List supported drop-off / pick-up locations
GET /v1/zones/search?q=cbd    Search locations
```

**B. Quote Estimator.** The heart of the product. Given origin, destination, weight, and package type, it returns the full spread of options across every transport class, each with cost, estimated time, and a reliability score.

```
POST /v1/quotes
```

**C. Order & Booking.** Once a shop's customer selects a quote, this module locks it in, generates a tracking ID, and notifies the relevant adapter.

```
POST /v1/shipments
```

**D. Webhooks & Unified Tracking.** Providers each track differently. Itafika normalizes their states into five universal ones — `package_picked`, `in_transit`, `at_sorting_hub`, `ready_for_pickup`, `delivered` — so a shop reads one vocabulary regardless of who carries the package.

```
GET /v1/shipments/{tracking_id}/track
```

---

## 8. Data model

A clean relational core makes the whole thing legible and contributable.

**Locations / Zones** — stable IDs, human-readable names, a type (CBD hub, stage, residential area), and coordinates.

**Providers** — transport type (rider, SACCO, national courier) and base connection details.

**Rates** — the matrix where the value concentrates: `origin_zone_id` × `destination_zone_id`, with a base cost and a cost-per-kg for each provider type.

The Rates table is the asset. It is the encoded answer to *"what are all the ways to move a parcel from A to B in Kenya, and what does each cost"* — the thing no one has assembled cleanly and openly, and the thing every consumer of Itafika gets for free.

The human-editable source of this data is `spec/data/`. The hosted Worker loads that data into D1 so the API can query it quickly.

---

## 9. Roadmap

**Phase 1 — The static API (MVP).** No scraping, no live tracking, no heroics. Seed D1 from the open dataset: standard Nairobi CBD rider rates, common upcountry matatu and bus parcel rates, national courier options, and a starter set of zones and stages. Ship the Worker API with the quote engine returning useful numbers from reviewed data. Open-source it immediately — because standardized location IDs and reliable price estimation are valuable on their own, before a single live integration exists.

**Phase 2 — Open adapter contribution.** Publish the `LogisticsProviderInterface` and invite the community to extend coverage provider by provider: an adapter that pulls live rates from a courier, a bridge that lets a manual rider confirm a status over WhatsApp, a new town's stage map. Queues handle background adapter work, and Workflows handle retry-heavy booking steps. The core never changes; the edges grow.

**Phase 3 — Payments and escrow.** Integrate Daraja / M-Pesa so that, for cash-on-delivery, Itafika can trigger a split — routing the delivery fee to the rider or SACCO and the balance to the merchant. Workflows are the right home for these multi-step flows because they need retries, waiting, auditability, and careful state transitions. This layer changes Itafika's regulatory posture, so it is deliberately last and treated with care.

---

## 10. Why open source, and why nothing else fills this slot

The serious logistics players in Kenya — the funded delivery companies, the agent networks, the on-demand apps — are all **closed products that own their own stack.** Each is useful. None is a public, open interface that any developer building a shop can call to get a standardized set of delivery options across riders, matatus, buses, and couriers. That layer simply does not exist.

Itafika is not trying to be a delivery company. It is trying to be the open standard *underneath* anyone who would otherwise integrate all of them by hand — the GTFS, or the OpenStreetMap, of Kenyan parcel logistics. The defensible, lasting asset is not the code, which is meant to be copied; it is the open, community-maintained representation of how delivery actually works in Kenya, kept fresh by the people who rely on it.

The work of mapping Kenya's delivery system should be done once and shared. That is the case for open source, and it is the reason Itafika should exist.

---

## 11. Status & next steps

This document is the founding concept. It is intentionally complete on the *what* and the *why*, and deliberately light on bikeshedding the *how* — that comes next, with the people who build and adopt it.

Immediate next steps:

- Freeze the Phase 1 API contract so early adopters can build against a stable shape.
- Seed the first useful dataset: Nairobi CBD hubs, common upcountry stages, and sourced static rates.
- Build the Cloudflare Worker reference API.
- Add D1 migrations and a seed command that loads `spec/data/`.
- Publish the `LogisticsProviderInterface` so the first adapters can be contributed.

*Itafika — so that any shop can simply say: it will arrive.*

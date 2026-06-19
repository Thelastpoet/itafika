# The Adapter Contract

> This is the official standard for Itafika adapters. Any adapter — no matter the language it's written in — must follow this contract. The TypeScript interface is in `packages/adapters/src/types.ts` and uses types from [`openapi.yaml`](openapi.yaml).
>
> The system uses adapters for **quotes and delivery orchestration handoff** (ADRs 0013, 0014, 0025). Tracking through adapters is coming later; for now, tracking updates come from bookings and manual updates (ADR 0015).

## What an adapter is

An **adapter** connects Itafika to a provider — like a rider pool, a matatu/bus SACCO, or a courier. The main engine talks to providers through this small interface, gets route/price/handoff answers, and returns them to the shop.

```
Core Routing Engine
   │  calls the same interface on every adapter
   ├──► RiderPoolAdapter        (boda_rider)
   ├──► MololineAdapter         (matatu_sacco)
   ├──► EasyCoachAdapter        (bus)
   └──► G4SAdapter              (national_courier)
```

This is how we grow: to add a new provider, you write one adapter. The contract is stable; the system handles quotes and delivery handoff through adapters. Tracking through adapters comes later (ADR 0015).

## The interface

Each adapter answers a few basic questions about its provider. These methods match the API in [`openapi.yaml`](openapi.yaml).

```typescript
interface DeliveryOrchestrationAdapter {
  /**
   * Basic info about this provider.
   */
  readonly info: ProviderInfo;

  /**
   * Can this provider serve this route, and what will it cost?
   * Return null if the provider doesn't serve this route
   * (e.g. a SACCO that only goes to Western being asked about Mombasa).
   *
   * Drives: POST /v1/quotes
   */
  quote(request: QuoteRequest): Promise<ProviderQuote | null>;

  /**
   * Create provider handoff state for a delivery that was already quoted.
   * Returns a provider reference and the starting status.
   *
   * Drives: POST /v1/deliveries
   */
  book(order: BookingOrder): Promise<BookingResult>;

  /**
   * Map the provider's tracking status to Itafika's universal statuses.
   * Optional for now.
   *
   * Drives: GET /v1/deliveries/{tracking_id}/track
   */
  track?(providerRef: string): Promise<TrackingStatus>;

  /**
   * List where this provider picks up and drops off parcels.
   * Optional — if not implemented, the provider won't show up in GET /v1/options.
   *
   * Drives: GET /v1/options
   */
  coverage?(query: CoverageQuery): Promise<ProviderCoverage[]>;
}
```

### Supporting types

```typescript
interface ProviderInfo {
  id: string;                 // stable slug, e.g. "mololine"
  name: string;               // display name, e.g. "Mololine Sacco"
  type: ProviderType;         // transport mode (ADR 0019)
  reliability_score?: number; // 0–1; asserted, not measured — omit rather than guess (ADR 0021)
}

interface ProviderQuote {
  estimated_cost_kes: number;
  estimated_time: string;     // e.g. "45 mins", "3 hours", "next day"
  // reliability_score is taken from ProviderInfo unless the adapter overrides it

  collection_type: CollectionType;       // office_pickup | door_delivery (ADR 0016)
  collection_point?: CollectionPoint;    // where to pick up (for office_pickup)
}

interface BookingOrder {
  quote_id: string;
  origin_zone_id: string;
  destination_zone_id: string;
  shop_order_ref: string;                 // shop-owned order/delivery reference (ADR 0025)
  shop_handoff_url?: string;              // shop-owned provider handoff URL (ADR 0025)
}

// ADR 0017 (discovery)
interface CoverageQuery {
  origin_zone_id: string;
  destination_town: string;
}

interface ProviderCoverage {
  collection_type: CollectionType;
  collection_points: CollectionPoint[];   // zones in the town this provider serves
  from_cost_kes?: number;                  // starting cost
}

interface BookingResult {
  provider_ref: string;       // the provider's own booking reference
  status: TrackingStatus;     // starting status
}
```

`QuoteRequest`, `ProviderType`, `TrackingStatus`, `CollectionType`, and `CollectionPoint` are defined in [`openapi.yaml`](openapi.yaml). Adapters use these shared types.

The shop owns customer/order/contact data. `shop_order_ref` and `shop_handoff_url` are the orchestration handles an adapter uses for provider handoff.

## The three kinds of adapter

Adapters only differ in *how* they get their answers.

**Static adapter** — gets quotes from the files in [`data/`](data/). It doesn't need the internet to work. Most contributors start here. For example, a matatu adapter looks up the price in a rate table.

**Manual (Human-in-the-loop) adapter** — for providers who don't have software, which is most providers in Kenya. `book()` might send a message (like via WhatsApp) to a rider or parcel desk. A human reply ("Accept") then updates the system. This lets Itafika work with traditional providers without forcing them to have an API.

**Live adapter** — for the few providers that have their own system. It gets quotes by calling that system (like an API), and should use static data as a backup if the provider's system is down. Most Kenyan providers don't have an API — that's what static and manual adapters are for.

## Rules for adapters

1. **Return `null` from `quote()` for routes you don't serve.** Don't guess. It's better to show nothing than a wrong price.
2. **Use the five universal statuses.** Don't invent your own. If your provider doesn't have a match for a status, just skip it.
3. **Prices are in KES (integers).** Times are readable strings. Follow the `Quote` schema exactly.
4. **Be resilient.** If a live adapter can't reach its provider, it should use static data or return `null`. It must not crash the whole system.
5. **Only assert a `reliability_score` you can stand behind.** It's optional — omit it rather than guess. There is no measurement loop yet, so any value is asserted, not computed from real deliveries (ADR 0021).
6. **No secrets in the code.** Live adapters must read API keys from environment variables, never from files saved in the repo.

## How to add an adapter

- [ ] Copy the reference adapter in `packages/adapters/src/static-adapter.ts`.
- [ ] Fill in `ProviderInfo` and implement `quote()` (and `book()` / `track()` if you can).
- [ ] If it's a static adapter, add your provider's data to [`data/`](data/) as described in [`data/SCHEMA.md`](data/SCHEMA.md).
- [ ] Run conformance tests: in a `*.test.ts`, use `describeAdapterConformance(...)`. It checks that your adapter follows the rules (like returning null for unserved routes).
- [ ] Open a PR. Describe the provider, the routes they cover, and **how you know** the prices are correct.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for more details.

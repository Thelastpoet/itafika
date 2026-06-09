# The Adapter Contract

> Part of the canonical Itafika standard. A conformant provider adapter — in any
> language — implements this contract. The TypeScript reference interface lives at
> `packages/adapters/src/types.ts` and uses the shared types generated from
> [`openapi.yaml`](openapi.yaml).
>
> The contract is canonical now. The Phase 1 reference Worker routes **quotes and
> booking** through adapter instances at runtime (ADRs 0013, 0014). Adapter-driven
> `track()` is not yet wired — tracking updates currently come from booking and the
> manual/internal path, all converging on one event log (ADR 0015).

## What an adapter is

An **adapter** teaches Itafika how to talk to exactly one provider — an independent rider pool, a matatu/bus SACCO's parcel service, or a national courier. The target engine architecture never contains provider-specific logic. In the fully wired model, it calls every adapter through the same small interface, collects their answers, and returns them to the shop.

```
Core Routing Engine
   │  calls the same interface on every adapter
   ├──► RiderPoolAdapter        (boda_rider)
   ├──► MololineAdapter         (matatu_sacco)
   ├──► EasyCoachAdapter        (bus)
   └──► G4SAdapter              (national_courier)
```

This is the intended open-source extension mechanism: to add a provider, you write one adapter. The contract is stable now; the reference runtime already routes quotes and booking through adapters, and the remaining work is wiring adapter-driven and webhook-driven tracking into the same model.

## The interface

Every adapter answers a small set of questions about its provider. Methods map directly to the API operations in [`openapi.yaml`](openapi.yaml).

```typescript
interface LogisticsProviderInterface {
  /**
   * Static metadata about this provider.
   */
  readonly info: ProviderInfo;

  /**
   * Can this provider serve the given route, and if so, what would it cost?
   * Return null if the provider does not serve this origin→destination pair
   * (e.g. a Rift Valley SACCO asked about a Mombasa route).
   *
   * Drives: POST /v1/quotes
   */
  quote(request: QuoteRequest): Promise<ProviderQuote | null>;

  /**
   * Book a previously-quoted delivery. Return a provider-side reference and the
   * initial universal status. In Phase 1 this may simply record the booking
   * (a "static" adapter) rather than dispatch to a live system.
   *
   * Drives: POST /v1/deliveries
   */
  book(order: BookingOrder): Promise<BookingResult>;

  /**
   * Translate this provider's own tracking state into Itafika's universal
   * statuses. Pull-based providers query here; push-based providers (webhooks)
   * call the engine's normalise() with the same mapping. Optional in Phase 1.
   *
   * Drives: GET /v1/deliveries/{tracking_id}/track
   */
  track?(providerRef: string): Promise<TrackingStatus>;
}
```

### Supporting types

```typescript
interface ProviderInfo {
  id: string;                 // stable slug, e.g. "mololine"
  name: string;               // display name, e.g. "Mololine Sacco"
  type: ProviderType;         // boda_rider | matatu_sacco | bus | national_courier
  reliability_score: number;  // 0–1 baseline; the engine may adjust over time
}

interface ProviderQuote {
  estimated_cost_kes: number;
  estimated_time: string;     // "45 mins", "3 hours", "next day"
  // reliability_score is taken from ProviderInfo unless the adapter overrides it
}

interface BookingOrder {
  quote_id: string;
  origin_zone_id: string;
  destination_zone_id: string;
  sender: Contact;
  recipient: Contact;
  package_description?: string;
}

interface BookingResult {
  provider_ref: string;       // the provider's own booking reference
  status: TrackingStatus;     // usually "package_picked" or an earlier mapped state
}
```

`QuoteRequest`, `ProviderType`, `TrackingStatus`, and `Contact` are exactly the schemas defined in [`openapi.yaml`](openapi.yaml) — adapters share the contract's types, they don't invent their own.

## The three kinds of adapter

Adapters differ only in *how* they answer, never in the interface.

**Static adapter** — answers `quote()` from the open dataset in [`data/`](data/). No network calls. This is the Phase 1 default and the template most contributors start from. A static matatu adapter looks up the rate matrix for the route and returns it.

**Live adapter** — answers `quote()` by calling the provider's real system: a courier's rate API, a scraped rate table, etc. Falls back to static data if the provider is unreachable.

**Human-in-the-loop adapter** — for providers with no software at all. `book()` sends a message (e.g. via a WhatsApp bot) to a rider or parcel desk, and a human reply ("Accept") drives the booking and status updates. This is how Itafika reaches genuinely non-digital providers without pretending they have an API.

## Rules for a conformant adapter

1. **Return `null` from `quote()` for routes you don't serve.** Don't guess or return a misleading price. An empty option is better than a wrong one.
2. **Map honestly to the five universal statuses.** Never invent a sixth. If your provider has no equivalent of `at_sorting_hub`, skip it — don't repurpose another.
3. **Costs are integers in KES.** Times are human-readable strings. Match the `Quote` schema exactly.
4. **Be resilient.** A live adapter that can't reach its provider should fall back to static data or return `null` — never throw in a way that breaks other providers' quotes. The engine isolates adapter failures, but adapters should fail soft.
5. **Declare a baseline `reliability_score`.** Be conservative; the engine may refine it from observed performance over time.
6. **No secrets in the repo.** Live adapters read credentials from environment/config, never from committed files.

## Adding an adapter (checklist)

- [ ] Copy the static reference adapter in `packages/adapters/src/static-adapter.ts`.
- [ ] Fill in `ProviderInfo` and implement `quote()` (and `book()` / `track()` if applicable).
- [ ] If static, add or reference your provider's rows in [`data/`](data/) per [`data/SCHEMA.md`](data/SCHEMA.md).
- [ ] Pass the adapter conformance tests.
- [ ] Open a PR describing the provider, the routes it covers, and how you know the rates.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full process.

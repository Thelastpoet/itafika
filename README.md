# Itafika

**An open-source logistics aggregator API for Kenya.**

*"Itafika"* — Swahili, *it will arrive.*

Itafika is a single, clean, predictable interface that any online shop can plug into to solve delivery and shipping. Locations, transport modes, and rates are already built in — so no developer has to model Kenya's delivery system from the ground up.

At checkout, a shop's customer picks a location and sees real options for getting the goods to them — a boda rider, a matatu or bus parcel service, a national courier — each with a price and an estimated time. The shop made one API call to get that. They didn't map a single stage, model a single rate, or integrate a single courier.

> **Delivery as something you consume, not something you build.**

---

## Why this exists

Kenya's e-commerce is a billion-dollar market and climbing, but delivery is the part that breaks the experience — not because there are too few ways to move a parcel, but because there are too many and none are standardized. Every shop re-solves the same problem from scratch, badly, and leaves the cheap informal options (matatu and bus parcel networks) off the table because wiring them up by hand is hopeless.

Itafika does that work **once, in the open, for everyone.** It is the abstraction layer for Kenyan delivery — what Daraja is to payments. It is **not** a delivery company; it is the open standard *beneath* anyone who would otherwise integrate every provider by hand.

For the full vision, see [`docs/Itafika-Concept-Doc.md`](docs/Itafika-Concept-Doc.md) (or the visual version at <https://itafika-tuu.pages.dev/>).

For the current implementation state, see [`docs/status.md`](docs/status.md).

For the next practical work queue, see [`docs/next-phase.md`](docs/next-phase.md).

For deployment of the current Worker reference implementation, see [`docs/deploy-worker.md`](docs/deploy-worker.md).

---

## What's in this repository

This is a **spec-first monorepo** with a deliberate split between the open standard and the Cloudflare-native reference implementation.

```
itafika/
├── spec/                  ★ the canonical, language-agnostic standard
│   ├── openapi.yaml        · the Phase 1 API contract
│   ├── adapter-contract.md · how to write a provider adapter
│   └── data/               · the open zones + rates dataset (+ schema)
├── packages/              Cloudflare-native reference implementation (TypeScript)
│   ├── core/               · routing engine + types generated from the spec
│   └── worker/             · Cloudflare Worker API
├── examples/               tiny shops calling the API
├── docs/                  concept doc, visual page, architecture decisions
│   ├── status.md           · what is implemented today
│   └── decisions/          · ADRs (why we made each technical choice)
├── CONTRIBUTING.md        how to add an adapter or data
├── GOVERNANCE.md          how decisions get made
└── LICENSE                MIT
```

**The `spec/` directory is the product.** Anyone could reimplement Itafika in Go, Python, Rust, or any other language from `spec/` alone. `packages/worker` is the hosted reference implementation of that standard.

The repository is still in development. Some ideas described in the concept doc are planned but not implemented yet. [`docs/status.md`](docs/status.md) is the place to check what exists today.

## Platform shape

The reference implementation is designed for **Cloudflare Workers**:

| Need | Cloudflare primitive |
|------|----------------------|
| Public API | Workers |
| Zones, providers, rates, deliveries, tracking events | D1 |
| Long-running booking or payment flows | Workflows |
| Background refreshes, webhook processing, async provider jobs | Queues |
| Per-delivery or per-provider coordination, when needed | Durable Objects |

Phase 1 can stay simple: a Worker reads the seeded dataset from D1 and returns quote options. Workflows, Queues, and Durable Objects are added only where the logistics lifecycle needs retries, background work, or strong coordination.

---

## The API at a glance (Phase 1)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/v1/zones` | List supported drop-off / pick-up locations |
| `GET`  | `/v1/zones/search?q=` | Search locations by name |
| `GET`  | `/v1/freshness` | List per-town dataset freshness dates |
| `POST` | `/v1/quotes` | Get delivery options + prices between two zones |
| `POST` | `/v1/deliveries` | Lock in a chosen quote, get a tracking ID |
| `GET`  | `/v1/deliveries/{tracking_id}/track` | Unified tracking status |

The heart is `POST /v1/quotes`:

```jsonc
// request
{
  "origin_zone_id": "ZONE_NBI_CBD_01",
  "destination_zone_id": "ZONE_NKR_MAIN",
  "package_weight_kg": 2.5
}

// response
{
  "quotes": [
    {
      "quote_id": "qt_8f3b4d2a91c4e87ab11d42ef",
      "provider_type": "matatu_sacco",
      "provider_name": "Mololine Sacco",
      "estimated_cost_kes": 400,
      "estimated_time": "3 hours",
      "reliability_score": 0.98
    }
  ]
}
```

The full contract — every field, type, and example — lives in [`spec/openapi.yaml`](spec/openapi.yaml).

---

## Customizable by design

Because Itafika is open source, the defaults are a **starting point, not a cage.** A shop with its own negotiated courier rate overrides it. Want to add a mode, hide one, or change how options are ranked? Do it on your end — without ever rebuilding the foundation.

---

## Status

🚧 **Phase 1 foundation — in active development.**

The branch already contains a working core package, Worker API, D1 migrations, seed flow, tests, and a simple shop example.

It does **not** yet contain every planned part of the wider Itafika architecture.

See [`docs/status.md`](docs/status.md) for the exact breakdown.

| Phase | What | State |
|-------|------|-------|
| **1 — Static API (MVP)** | Seeded static rates + standardized zone IDs behind the four endpoints. Quotes return real, useful numbers. | In active development |
| **2 — Open adapters** | Publish `LogisticsProviderInterface`; community contributes live provider adapters. | Planned |
| **3 — Payments & escrow** | Daraja / M-Pesa integration with COD split-billing. | Planned |

---

## Quickstart (reference implementation)

> Requires Node.js >= 20, pnpm, and Wrangler.

```bash
pnpm install
pnpm --filter @itafika/worker db:migrate:local
pnpm --filter @itafika/worker db:seed:local
pnpm --filter @itafika/worker dev      # starts the Worker locally
curl http://localhost:8787/v1/zones
```

For remote deployment, use [`docs/deploy-worker.md`](docs/deploy-worker.md).

---

## Contributing

The whole strategy depends on people contributing adapters and data. If you can describe how parcels move in your town — the stages, the providers, the rates — you can contribute, even without writing an adapter.

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). To write a provider adapter, read [`spec/adapter-contract.md`](spec/adapter-contract.md).

## License

[MIT](LICENSE) — use it in anything, including commercially. The code is meant to be copied; the lasting asset is the open, community-maintained representation of how delivery actually works in Kenya.

---

*Itafika — so that any shop can simply say: it will arrive.*

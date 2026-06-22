# Itafika

**A delivery orchestration API/control plane for ecommerce checkout in Kenya.**

*"Itafika"* is Swahili for *it will arrive.*

Itafika gives online shops one API for delivery options, provider handoff, and tracking state. Locations, transport modes, providers, and rates are already built in, so shops can focus on checkout while Itafika coordinates the delivery layer.

At checkout, a customer picks a location and sees real ways to get their goods: a boda rider, a matatu or bus parcel service, or a courier. Each option shows a price and an estimated time. The shop keeps its customer and order data, and Itafika returns the delivery facts the checkout needs.

> **Delivery should be something you use, not something you have to build yourself.**

---

## Why this exists

Online shopping in Kenya is growing fast, but delivery is often the hardest part. It's not because there aren't enough ways to move a parcel, but because there are too many and they don't work together. Every shop tries to solve this on their own, which is slow and difficult. Most shops leave out cheap options like matatus and buses because they are too hard to connect to.

Itafika does that coordination work **once, for everyone.** It is the shared delivery layer for Kenyan ecommerce, a bit like what OpenStreetMap is for maps: shared routes, rates, providers, handoff state, and tracking state that everyone can build on.

To integrate Itafika into your shop's checkout, start with the [**integration guide**](docs/integration-guide.md).

For the full vision, see [`docs/Itafika-Concept-Doc.md`](docs/Itafika-Concept-Doc.md) (or the visual version at <https://itafika-tuu.pages.dev/>).

For the current implementation state, see [`docs/status.md`](docs/status.md).

For the next practical work queue, see [`docs/next-phase.md`](docs/next-phase.md).

For deployment of the current Worker reference implementation, see [`docs/deploy-worker.md`](docs/deploy-worker.md).

---

## What's in this project

This project contains both the rules (the standard) and a working version of the API.

```
itafika/
├── spec/                  ★ the public contract and reference-data schema
│   ├── openapi.yaml        · the API design
│   ├── adapter-contract.md · how to connect a new delivery provider
│   └── data/               · reference-data seed and public snapshot format
├── packages/              the working API code (TypeScript)
│   ├── core/               · the engine that calculates prices and routes
│   ├── adapters/           · examples of how to connect to providers
│   └── worker/             · the live API you can talk to
├── examples/               small examples of shops using the API
├── docs/                  helpful guides and design documents
│   ├── status.md           · what is working right now
│   ├── release-checklist.md · checklist for maintainers
│   └── decisions/          · why we made certain technical choices
├── CONTRIBUTING.md        how to add new data or code
├── GOVERNANCE.md          how we make decisions
└── LICENSE                MIT
```

**The `spec/` folder is the most important part.** Anyone can build their own version of Itafika in any language (like Go or Python) just by following the rules in `spec/`. `packages/worker` is just one way to run it.

The project is still being built. Some parts are ready, and some are still planned. Check [`docs/status.md`](docs/status.md) to see what is working today.

## Platform shape

The current version is built to run on **Cloudflare**:

| Need | Tool used |
|------|-----------|
| Public API | Cloudflare Workers |
| Locations, rates, and orchestration state | D1 Database |
| Long flows and retries | Workflows |
| Background tasks | Queues |

Phase 1 is simple: the API reads data from the database and gives you delivery quotes. More advanced features like retries and background tasks will be added later as needed.

---

## The API at a glance (Phase 1)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/v1/zones` | List all locations (drop-off / pick-up points) |
| `GET`  | `/v1/zones/search?q=` | Search for a location by name |
| `GET`  | `/v1/freshness` | See when the data for each town was last updated |
| `POST` | `/v1/quotes` | Get delivery options and prices between two locations |
| `POST` | `/v1/deliveries` | Create delivery orchestration state from a selected quote |
| `GET`  | `/v1/deliveries/{tracking_id}/track` | See where your parcel is |
| `POST` | `/v1/deliveries/{tracking_id}/events` | Add a manual update to a delivery |

The most important part is `POST /v1/quotes`:

```jsonc
// you send:
{
  "origin_zone_id": "ZONE_NBI_CBD_01",
  "destination_zone_id": "ZONE_NKR_MAIN",
  "package_weight_kg": 2.5
}

// you get back:
{
  "quotes": [
    {
      "quote_id": "qt_8f3b4d2a91c4e87ab11d42ef",
      "provider_type": "matatu_sacco",
      "provider_name": "Mololine Sacco",
      "estimated_cost_kes": 400,
      "estimated_time": "3 hours",
      "reliability_score": 0.9
    }
  ]
}
```

You can find all the details in [`spec/openapi.yaml`](spec/openapi.yaml). ADR 0025 defines the Phase 2 booking boundary around `shop_order_ref` and optional `shop_handoff_url`; the current Worker still contains legacy booking-contact compatibility while that migration is pending. To see how to use this in a shop, check the [integration guide](docs/integration-guide.md).

---

## Use it your way

Itafika is open source, so you can change it to fit your needs. If your shop has a special price with a courier, you can use that instead of the default. You can hide certain delivery methods or change how options are ranked. You get a strong foundation for free, and you can build exactly what you need on top of it.

---

## Status

🚧 **Phase 1: currently being built.**

The basic parts are already working: the API, the database, tests, and a simple shop example.

You can see the live API here: `https://itafika-api.emcie4.workers.dev`.

Check [`docs/status.md`](docs/status.md) to see exactly what is ready.

| Phase | What | State |
|-------|------|-------|
| **1: Basic API** | Prices and locations for common routes. Booking and tracking are also ready. | Working now |
| **2: Growing the system** | More towns, providers, verified prices, provider on-ramps, and shop-referenced booking handoff. | Planned |
| **3: Better results** | Improving prices and reliability scores based on real deliveries. | Planned |

---

## Quickstart (Try it yourself)

> You need Node.js >= 20, pnpm, and Wrangler installed.

```bash
pnpm install
pnpm --filter @itafika/worker db:migrate:local
pnpm --filter @itafika/worker db:seed:local
pnpm --filter @itafika/worker dev      # starts the API locally
curl http://localhost:8787/v1/zones
```

To deploy this to your own Cloudflare account, see [`docs/deploy-worker.md`](docs/deploy-worker.md).

---

## Contributing

This project depends on people sharing their knowledge about delivery in Kenya. If you know the routes, prices, or stages in your town, you can help even if you don't write code.

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). If you want to connect a new delivery provider, read [`spec/adapter-contract.md`](spec/adapter-contract.md).

## License

[MIT](LICENSE). You can use this for anything, including for-profit businesses. The code is free for everyone to copy and use. The real value is the community-maintained list of how delivery actually works in Kenya.

---

*Itafika, so that any shop can simply say: it will arrive.*

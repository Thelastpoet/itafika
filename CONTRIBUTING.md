# Contributing to Itafika

Itafika only works if the people who depend on it help build it. The most valuable contributions are not always code — knowing that *"a sub-5kg box from Nairobi to Nyeri goes on Mololine for KES 400, leaves the stage hourly, and you collect it at the Nyeri main stage"* is exactly the kind of knowledge this project exists to capture.

There are three ways to contribute, from easiest to most involved.

Before you start, check [`docs/status.md`](docs/status.md). It explains what is already implemented, what is partial, and what is still planned.
Maintainers preparing a release or milestone should also use [`docs/release-checklist.md`](docs/release-checklist.md).

Also read [`docs/engineering-principles.md`](docs/engineering-principles.md). It sets the rules for boundaries, policy ownership, and how we avoid architectural drift.

## 1. Contribute data (no code required)

This is the highest-leverage thing most people can do. Two kinds of data:

**Zones & stages** — a hub, stage, or area we don't list yet, with a human-readable name, type, and approximate coordinates.

**Rates** — what a provider charges to move a package between two zones (base cost + cost-per-kg, and a rough delivery time).

How:

1. Open the dataset under [`spec/data/`](spec/data/) and read [`spec/data/SCHEMA.md`](spec/data/SCHEMA.md) so your entry matches the format.
2. Add or correct rows.
3. Run `pnpm data:validate`.
4. Open a pull request. In the description, say **how you know** the rate (you ship this route weekly, you called the SACCO, you're an agent, etc.) — provenance is what keeps the dataset trustworthy.

Rates drift. Correcting a stale rate is just as valuable as adding a new one.

If you want a worked example, read [`docs/contribute-data.md`](docs/contribute-data.md).

## 2. Contribute a provider adapter

An adapter teaches Itafika how to talk to one provider — a courier's rate API, a SACCO's parcel desk, a rider pool. Every adapter implements one interface, `LogisticsProviderInterface`, so the core engine never changes.

Read the full contract in [`spec/adapter-contract.md`](spec/adapter-contract.md). In short, an adapter answers three questions for its provider: *can you serve this route?*, *what would it cost and how long?*, and (later phases) *here's a booking — take it.*

The adapter contract is defined in [`spec/adapter-contract.md`](spec/adapter-contract.md), and the repository now includes a reference `packages/adapters/` package. Start from the static adapter there and extend it for your provider.

## 3. Contribute to the core / Worker

The reference implementation is a Cloudflare Worker written in TypeScript. The Worker exposes the API, the core routing engine computes quotes, and D1 stores zones, providers, rates, deliveries, and tracking events.

Cloudflare primitives are used only where they match the job:

- **Workers** serve the HTTP API.
- **D1** stores the relational dataset and Phase 1 delivery records.
- **Workflows**, **Queues**, and **Durable Objects** are reserved for later phases — for example, a booking handoff that sends a message to a parcel desk and waits for a human confirmation. None of them are in use today; Phase 1 runs on Workers and D1 alone.

Because the **spec is the source of truth**, changes that affect the API contract start with a change to [`spec/openapi.yaml`](spec/openapi.yaml) and a short ADR (see [`docs/decisions/`](docs/decisions/)) — never with code alone. This keeps the standard and the reference implementation from drifting apart.

If you are making a contract change, use [`docs/spec-change-checklist.md`](docs/spec-change-checklist.md).

---

## Ground rules

- **The spec leads.** Any change to endpoints, fields, or types is a change to `spec/openapi.yaml` first, then the code follows. Implementation-only changes that contradict the spec will be asked to fix the spec instead.
- **Backwards compatibility.** Shops build against `/v1`. Breaking changes wait for `/v2` and a deprecation window.
- **Provenance over precision.** A roughly-right rate with a clear source beats a confidently-wrong one with none.
- **Be kind.** Many contributors are domain experts (riders, agents, SACCO staff) who may not be developers. Their knowledge is the point.

## Pull request checklist

- [ ] If it touches the API surface, `spec/openapi.yaml` is updated and an ADR is added/linked.
- [ ] Data entries follow [`spec/data/SCHEMA.md`](spec/data/SCHEMA.md) and include provenance.
- [ ] If you add adapter code, it follows `LogisticsProviderInterface` and includes tests with the contribution.
- [ ] You agree to license your contribution under the project's [MIT License](LICENSE).

## Getting help

Open an issue with the `question` label. If you're unsure whether something belongs in the spec, the core engine, or the Worker, ask before writing a lot of code — it saves everyone time.

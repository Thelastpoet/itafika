# ADR 0001 — TypeScript and Cloudflare Workers for the reference implementation

**Status:** Accepted
**Date:** 2026-06-08

## Context

Itafika is both an open standard and a working API. The standard must stay easy to read and reimplement, while the hosted reference implementation should be simple to deploy, cheap to operate, and friendly to contributors.

Most Itafika work is I/O-bound: reading zone and rate data, returning quotes, calling provider systems, receiving webhooks, and coordinating shipment state. The platform should handle that without forcing the project to operate servers.

## Decision

The reference implementation is **TypeScript on Cloudflare Workers**.

The main platform pieces are:

- **Workers** for the public HTTP API.
- **D1** for zones, providers, rates, shipments, and tracking events.
- **Queues** for background jobs such as webhook processing, rate refreshes, and adapter work that should not block a checkout request.
- **Workflows** for durable multi-step processes such as booking, provider retries, and human-in-the-loop confirmation.
- **Durable Objects** for stateful coordination when one shipment, provider, or stream needs a single authority.
- **Wrangler** for local development, D1 migrations, seed data, and deployment.

The API contract remains in [`spec/openapi.yaml`](../../spec/openapi.yaml). The Worker, core engine, and adapters compile against types generated from that spec.

## Rationale

- **Contributor-friendly.** TypeScript, JSON, and HTTP are familiar to the web developers most likely to contribute adapters and examples.
- **Spec fidelity.** Generated types keep the Worker, core engine, and adapters aligned with the OpenAPI contract.
- **Low operating burden.** Workers, D1, Queues, Workflows, and Durable Objects remove the need to run separate API servers, job workers, and databases for the early product.
- **Good fit for logistics.** Delivery flows are naturally asynchronous and retry-heavy. Cloudflare Workflows and Queues give those flows durable execution without turning the API into a long-running server process.
- **Small Phase 1 surface.** The MVP can be a Worker plus D1. More primitives are introduced only when the lifecycle needs them.

## Consequences

- Contributors need Node.js, pnpm, and Wrangler.
- Worker code is written as request handlers, not as a traditional server that listens on a port.
- The reference implementation should avoid packages that require unsupported Node.js runtime behavior.
- Durable Objects, Queues, and Workflows are used deliberately, not by default. Simple reads and writes stay in D1.

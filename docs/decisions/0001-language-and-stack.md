# ADR 0001 — Use TypeScript and Cloudflare Workers

**Status:** Accepted
**Date:** 2026-06-08

## Context

Itafika is an open standard and a working API. The standard should be easy to understand, while the reference implementation should be simple to deploy and cheap to run.

Most work involves I/O tasks: reading data, returning quotes, and tracking packages. We want a platform that handles this without needing us to manage servers.

## Decision

The reference implementation uses **TypeScript and Cloudflare Workers**.

Key components:

- **Workers** for the HTTP API.
- **D1** for storing zones, providers, rates, delivery orchestration state, and tracking events.
- **Queues** for background tasks like processing webhooks.
- **Workflows** for multi-step processes like booking and retries.
- **Durable Objects** for managing state when a single authority is needed.
- **Wrangler** for development and deployment.

The API contract remains in [`spec/openapi.yaml`](../../spec/openapi.yaml). The Worker, core engine, and adapters compile against types generated from that spec.

## Rationale

- **Contributor-friendly.** TypeScript, JSON, and HTTP are familiar to the web developers most likely to contribute adapters and examples.
- **Spec fidelity.** Generated types keep the Worker, core engine, and adapters aligned with the OpenAPI contract.
- **Low operating burden.** Workers, D1, Queues, Workflows, and Durable Objects remove the need to run separate API servers, job workers, and databases for the early product.
- **Good fit for delivery orchestration.** Delivery flows are naturally asynchronous and retry-heavy. Cloudflare Workflows and Queues give those flows durable execution without turning the API into a long-running server process.
- **Small Phase 1 surface.** The MVP can be a Worker plus D1. More primitives are introduced only when the lifecycle needs them.

## Consequences

- Contributors need Node.js, pnpm, and Wrangler.
- Worker code is written as request handlers, not as a traditional server that listens on a port.
- The reference implementation should avoid packages that require unsupported Node.js runtime behavior.
- Durable Objects, Queues, and Workflows are used deliberately, not by default. Simple reads and writes stay in D1.

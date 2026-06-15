# ADR 0003 — Use Cloudflare D1 for data storage

**Status:** Accepted — partially superseded by [ADR 0023](0023-data-lives-in-d1-not-git.md)
**Date:** 2026-06-08

> The choice of D1 stands. The "CSV files are the source of truth, D1 is disposable" part
> of this ADR is superseded by [ADR 0023](0023-data-lives-in-d1-not-git.md), which makes
> D1 the operational source of truth.

## Context

The API needs a way to store and query zones, rates, and providers. It also needs to record deliveries and tracking events. The database should be easy to use and work well with our hosting platform.

## Decision

The reference implementation uses **Cloudflare D1** as its database.

D1 stores:
- Zones, providers, and rates
- Dataset freshness info
- Deliveries and tracking events
- Quote selections

The source of truth for seed data remains the CSV files in [`spec/data/`](../../spec/data/). D1 is used to query this data efficiently.

## Rationale

- **Relational shape.** Zones, providers, and rates are naturally SQL tables with clear foreign keys.
- **Cloudflare-native.** D1 is directly available to Workers through bindings and works well with Wrangler for local development and migrations.
- **Simple Phase 1.** The MVP can run as a Worker plus D1 without operating a separate database server.
- **Reviewable data.** Contributors edit CSV files, not database rows. Seed scripts load those files into D1.
- **Room for later workflows.** Shipments, tracking events, and booking state can be stored in D1, while long-running steps use Workflows and Queues.

## Consequences

- Migrations define the D1 schema.
- Seed scripts load `spec/data/*.csv` into local and deployed D1 databases.
- Query code should use D1-friendly SQL or a Workers-compatible query layer.
- External Postgres can still be used by another implementation, but it is not required for the reference implementation.
- Dataset freshness/versioning stays in `spec/data/` and is also loaded into D1 for API responses.

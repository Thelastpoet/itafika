# ADR 0003 — D1 as the reference datastore

**Status:** Accepted
**Date:** 2026-06-08

## Context

Phase 1 is a read-heavy lookup API over a small, mostly-static dataset: zones, providers, rates, and freshness metadata. The API also needs to record shipments and tracking events once booking is introduced.

The datastore should be relational, easy to seed from `spec/data/`, simple to run locally, and native to the hosted platform.

## Decision

The reference implementation uses **Cloudflare D1** as its datastore.

D1 stores:

- zones
- providers
- rates
- dataset freshness metadata
- quotes or quote selections when persistence is needed
- shipments
- tracking events

The canonical, human-editable source of seed data remains [`spec/data/`](../../spec/data/). D1 is the queryable projection used by the Worker.

## Rationale

- **Relational shape.** Zones, providers, and rates are naturally SQL tables with clear foreign keys.
- **Cloudflare-native.** D1 is directly available to Workers through bindings and works well with Wrangler for local development and migrations.
- **Simple Phase 1.** The MVP can run as a Worker plus D1 without operating a separate database server.
- **Reviewable data.** Contributors edit CSV files, not database rows. Seed scripts load those files into D1.
- **Room for later workflows.** Shipments, tracking events, payment state, and booking state can be stored in D1, while long-running steps use Workflows and Queues.

## Consequences

- Migrations define the D1 schema.
- Seed scripts load `spec/data/*.csv` into local and deployed D1 databases.
- Query code should use D1-friendly SQL or a Workers-compatible query layer.
- External Postgres can still be used by another implementation, but it is not required for the reference implementation.
- Dataset freshness/versioning stays in `spec/data/` and is also loaded into D1 for API responses.

# ADR 0003 — SQLite for development, Postgres for production

**Status:** Accepted
**Date:** 2026-06-08

## Context

In Phase 1 Itafika is essentially a read-heavy lookup over a relatively small, mostly-static dataset (zones, providers, a rates matrix). The dominant requirement is **a contributor can clone the repo and have a working, seeded database in seconds**, with zero external services. Production needs concurrency and managed hosting, but the data volume is modest.

## Decision

- **Local development & tests:** SQLite, seeded from `spec/data/` on startup. No services to install.
- **Production:** PostgreSQL.
- **Access layer:** a query/ORM layer that targets both (e.g. Prisma), so the same schema and code run against either, chosen at deploy time by connection string.

The schema is defined once and is the same shape in both; the canonical, human-editable source of the *data* remains the files in `spec/data/` (see [`spec/data/SCHEMA.md`](../../spec/data/SCHEMA.md)).

## Rationale

- **Zero-friction onboarding.** "Clone, install, run, and the quotes endpoint returns real numbers" is the single biggest driver of first contributions. SQLite delivers that with no daemon.
- **The dataset is small and mostly static** in Phase 1, so SQLite is genuinely sufficient for dev and even small deployments.
- **Postgres for production** gives proper concurrency, managed hosting options, and room for Phase 2/3 (live adapters, bookings, payments) without re-architecting.
- **`spec/data/` is the source of truth, not the database.** The DB is a queryable projection of the open dataset; this keeps the data part of the standard and reviewable in pull requests.

## Options considered

- **Postgres everywhere** — rejected for dev because requiring a running Postgres raises the barrier to a first contribution for little benefit at this data scale.
- **Flat files / in-memory only** — rejected because Phase 2/3 need transactional writes (shipments, bookings, payment splits); committing to a real relational store now avoids a migration later.

## Consequences

- We maintain one schema that is portable across SQLite and Postgres; we avoid database-specific features that don't exist in both until production-only paths justify them.
- A seed step loads `spec/data/` into whichever database is configured.
- Freshness/versioning of the dataset is handled in `spec/data/`, not the database (see the data schema doc).

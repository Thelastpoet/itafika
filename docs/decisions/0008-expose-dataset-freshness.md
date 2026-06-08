# ADR 0008 — Expose dataset freshness through the API

**Status:** Accepted
**Date:** 2026-06-08

## Context

The Phase 1 dataset already includes `freshness.csv`, and the reference Worker already loads that data into D1.

The point of the freshness metadata is to help consumers reason about staleness:

- how recently a town's rates were reviewed
- whether a quoted route is based on newer or older data
- whether the hosted reference dataset is fresh enough for the consumer's use case

Until now, the metadata existed in the repository and database but was not exposed through the API.

## Decision

Add a small read-only endpoint:

- `GET /v1/freshness`

It returns the per-town freshness records currently loaded into the dataset.

This keeps the data model honest: if freshness metadata is part of the canonical dataset and loaded into D1, consumers should be able to read it without scraping repository files.

## Rationale

- **Useful Phase 1 signal.** Consumers can reason about staleness without waiting for later phases.
- **Low complexity.** The data already exists and is already seeded.
- **Spec-first consistency.** ADR 0003 states that dataset freshness is loaded into D1 for API responses. This change makes that true in the actual API surface.
- **Good open-source ergonomics.** Data contributors and early adopters can see the practical effect of `freshness.csv`.

## Options considered

- **Keep freshness only in repository files.** Rejected — that is less useful to API consumers and contradicts the D1/API direction already described in the datastore ADR.
- **Attach freshness to every quote response.** Rejected for now — useful later, but it adds response complexity where a small focused endpoint is enough.
- **Wait for a later major phase.** Rejected — this is a small, low-risk addition that improves transparency now.

## Consequences

- The OpenAPI contract gains a new read-only endpoint.
- Generated types need to be refreshed.
- The Worker adds a small D1 query and response handler.

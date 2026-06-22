# ADR 0008: Show data freshness in the API

**Status:** Accepted
**Date:** 2026-06-08

## Context

The project already tracks how "fresh" the data is for each town in a CSV file. We want to make this information available to users through the API so they know how recent the rates are.

## Decision

Add a `GET /v1/freshness` endpoint that returns the freshness records for each town currently in the dataset.

## Rationale

- **Useful Phase 1 signal.** Consumers can reason about staleness without waiting for later phases.
- **Low complexity.** The data already exists and is already seeded.
- **Spec-first consistency.** ADR 0003 states that dataset freshness is loaded into D1 for API responses. This change makes that true in the actual API surface.
- **Good open-source ergonomics.** Data contributors and early adopters can see the practical effect of `freshness.csv`.

## Options considered

- **Keep freshness only in repository files.** Rejected: that is less useful to API consumers and contradicts the D1/API direction already described in the datastore ADR.
- **Attach freshness to every quote response.** Rejected for now: useful later, but it adds response complexity where a small focused endpoint is enough.
- **Wait for a later major phase.** Rejected: this is a small, low-risk addition that improves transparency now.

## Consequences

- The OpenAPI contract gains a new read-only endpoint.
- Generated types need to be refreshed.
- The Worker adds a small D1 query and response handler.

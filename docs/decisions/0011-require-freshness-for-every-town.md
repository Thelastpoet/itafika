# ADR 0011: Ensure all towns have freshness data

**Status:** Accepted
**Date:** 2026-06-08

## Context

We want to make sure every town in our dataset has information about how recently its data was updated. Currently, some towns are missing this data.

## Decision

Every town listed in `zones.csv` must have a corresponding entry in `freshness.csv`. Our data validator will enforce this.

## Rejected options

### Keep freshness optional per town

Rejected because it weakens the meaning of dataset freshness and makes the `/v1/freshness` endpoint incomplete by accident.

### Infer freshness from the most recent rate source

Rejected because the project already models freshness explicitly, and provenance strings are not a reliable date source.

## Consequences

Positive:

- every published town has explicit staleness metadata
- contributors get a clear rule when adding towns
- the dataset API remains complete and predictable

Tradeoffs:

- small extra maintenance burden when adding a new town

That burden is acceptable because the data contract becomes clearer and more trustworthy.

# ADR 0011: Require Freshness Coverage for Every Dataset Town

- Status: Accepted
- Date: 2026-06-08

## Context

The dataset already includes `freshness.csv` so consumers can reason about staleness by town.

The validator checked that each freshness row referred to a real town in `zones.csv`, but it did not enforce the reverse. That meant a town could appear in the canonical zone dataset without any freshness record at all.

That is a contract gap:

- API consumers may assume freshness exists for the loaded dataset
- maintainers may think a town is covered when its staleness metadata is missing
- contributors have no hard rule telling them that adding a town also requires a freshness row

## Decision

Every town that appears in `zones.csv` must have exactly one row in `freshness.csv`.

The validator will enforce this, and the dataset schema/docs will state it directly.

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

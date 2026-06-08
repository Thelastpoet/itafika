# How To Contribute Data

This guide is for contributors who want to improve the open dataset.

You do not need to write application code to help. If you know a stage, route, provider, or rate that should be added or corrected, that is a valid contribution.

## What you can contribute

You can contribute:

- a new zone or stage
- a corrected zone name or coordinates
- a new provider
- a new route rate
- a corrected existing rate
- a freshness update for a town

## Files you will edit

The dataset lives in `spec/data/`.

Main files:

- `zones.csv`
- `providers.csv`
- `rates.csv`
- `freshness.csv`

Schema and rules:

- `spec/data/SCHEMA.md`

## One worked example

Example: adding a new route rate for Mololine from Nairobi CBD to Nyeri.

Add a row to `spec/data/rates.csv`:

```csv
provider_id,origin_zone_id,destination_zone_id,base_cost_kes,cost_per_kg_kes,est_time,max_weight_kg,source
mololine,ZONE_NBI_CBD_01,ZONE_NYR_MAIN,350,0,3 hours,20,sacco-desk-call
```

What each value means:

- `provider_id`: the provider slug from `providers.csv`
- `origin_zone_id`: the starting zone from `zones.csv`
- `destination_zone_id`: the destination zone from `zones.csv`
- `base_cost_kes`: flat starting price in Kenya Shillings
- `cost_per_kg_kes`: extra cost per kg
- `est_time`: human-readable estimate
- `max_weight_kg`: service weight cap
- `source`: how you know the rate

## Provenance matters

The `source` field is required.
Every town in `zones.csv` must also appear exactly once in `freshness.csv`.

Good examples:

- `field-2026-06`
- `sacco-desk-call`
- `merchant-verified`
- `agent-verified`

Bad examples:

- `guess`
- `internet`
- `friend`

If the rate is approximate, that is still better than a hidden guess. Just describe the source honestly in the PR.

## Before you open a PR

Run:

```bash
pnpm data:validate
```

That checks:

- required fields
- duplicates
- zone/provider references
- number formats
- enum values
- freshness date format
- freshness coverage for every town

## If you are correcting a stale rate

That is a valuable contribution.

When you change an existing rate:

- update the row in `rates.csv`
- keep the zone and provider IDs stable
- update the `source`
- update the town date in `freshness.csv` if needed
- if you add a new town in `zones.csv`, add its freshness row in the same PR

## PR checklist for data contributions

- explain what changed
- explain how you know the data
- mention if the rate is exact or approximate
- include the affected town or route in the PR description

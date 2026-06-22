# How to Help with Delivery Data

This guide is for anyone who wants to help improve Itafika reference data: locations,
providers, routes, rates, and freshness.

Today, the CSV files in `spec/data/` are the seed and public snapshot format. ADR 0023
makes D1 the operational source of truth for reference data, with moderated online
updates as Phase 2 is built.

You don't need to be a developer to help. If you know a stage, a route, a provider, or
a price that needs to be added or fixed, you can contribute.

## What you can help with

- Add a new town, stage, or hub.
- Fix the name or location of a stage.
- Add a new provider.
- Add a new price for a route.
- Fix an old or wrong price.
- Update the date when a town's prices were last checked.

## Files you will edit

Our data is kept in the `spec/data/` folder in these files:

- `zones.csv`: list of towns and stages.
- `providers.csv`: list of providers.
- `rates.csv`: list of prices between locations.
- `freshness.csv`: when each town's data was last checked.

## Example: How to add a rate

Let's say you want to add the price for Mololine from Nairobi to Nyeri.

You would add a new line to `spec/data/rates.csv`:

```csv
provider_id,origin_zone_id,destination_zone_id,base_cost_kes,cost_per_kg_kes,est_time,max_weight_kg,source
mololine,ZONE_NBI_CBD_01,ZONE_NYR_MAIN,350,0,3 hours,20,sacco-desk-call
```

What each value means:

- `provider_id`: The ID of the provider (find it in `providers.csv`).
- `origin_zone_id`: Where the parcel starts (find it in `zones.csv`).
- `destination_zone_id`: Where the parcel is going (find it in `zones.csv`).
- `base_cost_kes`: The starting price in Kenya Shillings.
- `cost_per_kg_kes`: Any extra cost for each kg.
- `est_time`: How long it usually takes.
- `max_weight_kg`: The maximum weight they can carry.
- `source`: How you know this price (e.g., you called them or saw it at the stage).

## Where the data comes from (Source)

It's important to tell us how you found the information. This helps others trust the data.

Good examples of a source:

- `field-check-2026-06` (you went there yourself)
- `sacco-desk-call` (you called their office)
- `merchant-verified` (a shop owner confirmed it)

Please don't just guess. If you're not 100% sure about a price, tell us it's an estimate in your submission.

## Before you submit your changes

If you are a developer, run this command to check for errors:

```bash
pnpm data:validate
```

This checks for:

- Missing information.
- Duplicate lines.
- Correct number and date formats.
- Whether every town has a "freshness" date.

## If you are fixing an old price

Fixing old data is just as important as adding new data.

When you change a price:

- Update the line in `rates.csv`.
- Tell us where you got the new price (the `source`).
- Update the date for that town in `freshness.csv`.

## Checklist for your submission

- Explain what you changed.
- Tell us how you found the information.
- Let us know if the prices are exact or just estimates.
- Mention which town or route you updated.

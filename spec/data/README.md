# Itafika open dataset

The source of truth for zones, providers, and rates. See [`SCHEMA.md`](SCHEMA.md) for the format and conventions.

| File | What |
|------|------|
| `zones.csv` | Locations — CBD hubs, stages, residential areas |
| `providers.csv` | Carriers and their baseline reliability |
| `rates.csv` | The cost matrix: provider × origin × destination |
| `freshness.csv` | Per-town last-updated dates |

> ⚠️ **The current rates are `seed-illustrative` placeholders**, not verified field
> data. They exist so the API returns plausible numbers on day one and to show the
> format. **Replacing them with real, sourced rates is the single most valuable
> early contribution** — see [CONTRIBUTING.md](../../CONTRIBUTING.md). When you add a
> verified rate, set its `source` to something traceable (e.g. `field-2026-06`,
> `sacco-desk-call`) and update `freshness.csv`.

# Itafika Open Dataset

This folder defines the seed and public snapshot format for Itafika reference data:
zones, providers, modes, routes, rates, and freshness. See [`SCHEMA.md`](SCHEMA.md)
for details on the format.

ADR 0023 makes D1 the operational source of truth for reference data. These CSV files
remain useful as seed data, examples, and generated public export snapshots.

| File | What's in it |
|------|------|
| `zones.csv` | Locations such as CBD hubs, stages, and estates |
| `providers.csv` | List of providers and their reliability |
| `rates.csv` | Price list: provider × origin × destination |
| `freshness.csv` | When data for each town was last updated |

> ⚠️ **The current prices are just examples**, they are not verified yet. They are here to show how the format works. **The most helpful thing you can do is replace these with real prices.** When you add a real price, say how you found it (e.g. `called-sacco-desk`) and update `freshness.csv`. Every town listed in `zones.csv` must have a row in `freshness.csv`.

Before opening a PR, run:

```bash
pnpm data:validate
```

For a step-by-step guide, see [docs/contribute-data.md](../../docs/contribute-data.md).

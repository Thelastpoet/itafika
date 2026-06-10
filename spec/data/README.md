# Itafika Open Dataset

This is where we store all information about zones, providers, and prices. See [`SCHEMA.md`](SCHEMA.md) for details on the format.

| File | What's in it |
|------|------|
| `zones.csv` | Locations — like CBD hubs, stages, and estates |
| `providers.csv` | List of carriers and their reliability |
| `rates.csv` | Price list: provider × origin × destination |
| `freshness.csv` | When data for each town was last updated |

> ⚠️ **The current prices are just examples**, they are not verified yet. They are here to show how the format works. **The most helpful thing you can do is replace these with real prices.** When you add a real price, say how you found it (e.g. `called-sacco-desk`) and update `freshness.csv`. Every town listed in `zones.csv` must have a row in `freshness.csv`.

Before opening a PR, run:

```bash
pnpm data:validate
```

For a step-by-step guide, see [docs/contribute-data.md](../../docs/contribute-data.md).

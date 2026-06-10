# Open Dataset — Schema & Rules

These files show how parcels move across Kenya. They are maintained by the community and are the official source of truth for the Itafika project.

The data is organized into four files: **zones**, **providers**, **rates**, and **modes**. They are CSV files, so they are easy to edit and review in a Pull Request.

---

## `zones.csv` — locations

Every place where a package can be picked up or dropped off.

| Column | Type | Notes |
|--------|------|-------|
| `id` | string | A unique ID. Format: `ZONE_<TOWN>_<KIND>_<NN>`, e.g. `ZONE_NBI_CBD_01`. Once assigned, it is never changed. |
| `name` | string | Name of the place, e.g. `RNG Plaza`, `Nyeri Main Stage`. |
| `type` | enum | `cbd_hub`, `stage`, or `residential_area`. |
| `town` | string | Town or city, e.g. `Nairobi`, `Nyeri`. |
| `county` | string | The county the zone is in. |
| `lat` | number | Latitude (optional for stages). |
| `lng` | number | Longitude (optional for stages). |

**ID rules:** use short town codes — `NBI` (Nairobi), `NKR` (Nakuru), `NYR` (Nyeri), `ELD` (Eldoret), `MSA` (Mombasa), `KSM` (Kisumu). For KIND, use `CBD`, `STG` (stage), or `RES` (residential).

---

## `providers.csv` — carriers

| Column | Type | Notes |
|--------|------|-------|
| `id` | string | Unique ID, e.g. `mololine`, `g4s`. |
| `name` | string | Name shown to customers, e.g. `Mololine Sacco`. |
| `type` | string | Transport mode ID (from `modes.csv`), e.g. `matatu_sacco`. |
| `reliability_score` | number | 0–1 score based on performance. Start conservative. |

---

## `modes.csv` — transport modes

The different ways parcels can be moved (e.g. by boda, matatu, or bus). This list is managed in this file, not in the code. If you add a mode here, it will automatically show up in the API.

| Column | Type | Notes |
|--------|------|-------|
| `id` | string | Unique ID, e.g. `shuttle`. Used in `providers.csv`. |
| `label` | string | Name shown to customers, e.g. `Shuttle`. |
| `description` | string | A short description of the mode. |
| `source` | string | **Where this info came from.** |

The default modes are `boda_rider`, `matatu_sacco`, `bus`, `national_courier`, `shuttle`, `taxi`, and `cargo_truck`.

---

## `rates.csv` — the price list

One row for every route a provider serves. This is the most important part of the dataset.

| Column | Type | Notes |
|--------|------|-------|
| `provider_id` | string | The ID of the provider. |
| `origin_zone_id` | string | Where the parcel starts. |
| `destination_zone_id` | string | Where the parcel ends. |
| `base_cost_kes` | integer | Starting price in KES. |
| `cost_per_kg_kes` | integer | Extra cost for every kg. Use `0` for flat-rate. |
| `est_time` | string | How long it takes, e.g. `45 mins`, `3 hours`, `next day`. |
| `max_weight_kg` | number | Maximum weight allowed. Leave blank if there's no limit. |
| `collection_type` | enum | `office_pickup` or `door_delivery`. |
| `source` | string | **Where you got this price.** e.g. `called-sacco-desk`, `field-trip-2024`. |

**How prices are calculated:** `Total Cost = base_cost + (weight * cost_per_kg)`. Results are rounded to the nearest 10 KES.

---

## Rules to follow

- **Always include the source.** Every price must have a `source`. A roughly-correct price with a clear source is better than a guess.
- **Update old prices.** Prices change often. Updating an old price is just as important as adding a new one.
- **Freshness is required for every town.** Every town in `zones.csv` must be listed in `freshness.csv` so we know when it was last checked.
- **IDs are forever.** Once an ID (like a `zone.id`) is used, it shouldn't be reused for something else.
- **Don't assume prices are the same both ways.** A route from A to B might cost more than B to A. Each direction needs its own row.

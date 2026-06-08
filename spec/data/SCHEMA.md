# The Open Dataset — schema & conventions

The files in this directory are the **open, community-maintained representation of
how parcels move in Kenya**. They are part of the canonical standard, not an
implementation detail — the reference server loads them into its database, but the
files here are the source of truth and the thing pull requests review.

Three datasets, mirroring the data model: **zones**, **providers**, and **rates**.
Each is provided as CSV (easy to edit and review in a PR) with the schema below.

---

## `zones.csv` — locations

Every place a package can be picked up or dropped off.

| Column | Type | Notes |
|--------|------|-------|
| `id` | string | Stable, human-readable. Format: `ZONE_<TOWN>_<KIND>_<NN>`, e.g. `ZONE_NBI_CBD_01`. Never reused once assigned. |
| `name` | string | Human-readable, e.g. `RNG Plaza`, `Nyeri Main Stage`. |
| `type` | enum | `cbd_hub` \| `stage` \| `residential_area`. |
| `town` | string | Town/city, e.g. `Nairobi`, `Nyeri`. |
| `lat` | number | Approximate latitude. Blank allowed for stages with no precise pin. |
| `lng` | number | Approximate longitude. |

**ID convention:** town codes are short and stable — `NBI` Nairobi, `NKR` Nakuru, `NYR` Nyeri, `ELD` Eldoret, `MSA` Mombasa, `KSM` Kisumu. Kind is `CBD`, `STG` (stage), or `RES` (residential).

---

## `providers.csv` — who carries packages

| Column | Type | Notes |
|--------|------|-------|
| `id` | string | Stable slug, e.g. `mololine`, `cbd_rider_pool`, `g4s`. |
| `name` | string | Display name shown to customers, e.g. `Mololine Sacco`. |
| `type` | enum | `boda_rider` \| `matatu_sacco` \| `bus` \| `national_courier`. |
| `reliability_score` | number | 0–1 baseline. Be conservative. |

---

## `rates.csv` — the matrix (the asset)

One row per (provider, origin, destination). This is where Itafika's value concentrates.

| Column | Type | Notes |
|--------|------|-------|
| `provider_id` | string | FK → `providers.id`. |
| `origin_zone_id` | string | FK → `zones.id`. |
| `destination_zone_id` | string | FK → `zones.id`. |
| `base_cost_kes` | integer | Flat base cost in KES. |
| `cost_per_kg_kes` | integer | Added per kg of package weight. `0` for flat-rate providers. |
| `est_time` | string | Human-readable, e.g. `45 mins`, `3 hours`, `next day`. |
| `max_weight_kg` | number | Provider's cap for this service. Blank = no stated cap. |
| `source` | string | **Provenance.** How this rate is known — `field-2026-06`, `sacco-desk-call`, `agent`, etc. |

**Quote math (Phase 1):** `estimated_cost_kes = base_cost_kes + ceil(package_weight_kg) * cost_per_kg_kes`, rounded to the nearest 10 KES. A rate only applies if `package_weight_kg <= max_weight_kg` (when set).

---

## Conventions

- **Provenance is mandatory.** Every rate row carries a `source`. A roughly-right rate with a clear source beats a confident guess.
- **Correcting beats adding.** Rates drift; updating a stale one is a first-class contribution.
- **Freshness.** Each region's last-updated date is tracked in `freshness.csv` (`town,last_updated`) so consumers can reason about staleness.
- **IDs are forever.** Once a `zone.id` or `provider.id` is published, it isn't reused or repurposed; retire instead.
- **Symmetry isn't assumed.** A→B and B→A are separate rows; return rates often differ.

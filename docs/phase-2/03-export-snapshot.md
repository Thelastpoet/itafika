# 03 - Public Export Snapshot

Purpose: preserve open reference data after D1 becomes operational source of truth.

## Files

- `packages/worker/src/export-service.ts`
- `packages/worker/src/index.ts`
- `packages/worker/wrangler.jsonc`
- `packages/worker/worker-configuration.d.ts`
- `packages/worker/tests/index.spec.ts`
- `docs/contribute-data.md`
- `docs/deploy-worker.md`

## Wrangler Config

Add:

```jsonc
"triggers": {
  "crons": ["10 2 * * *"]
},
"r2_buckets": [
  {
    "binding": "reference_exports",
    "bucket_name": "itafika-reference-exports"
  }
]
```

Run:

```bash
pnpm --filter @itafika/worker exec wrangler types
```

## Export Shape

`GET /v1/export` and the R2 snapshot must return:

```json
{
  "export_version": 1,
  "generated_at": "2026-06-19T02:10:00.000Z",
  "source": "itafika-d1",
  "tables": {
    "zones": [],
    "modes": [],
    "providers": [],
    "rates": [],
    "freshness": []
  },
  "row_counts": {
    "zones": 0,
    "modes": 0,
    "providers": 0,
    "rates": 0,
    "freshness": 0
  }
}
```

## Implementation Checklist

- [x] Keep hardcoded allowlist:

```ts
const REFERENCE_TABLES = ["zones", "modes", "providers", "rates", "freshness"] as const;
```

- [x] Add `export_version`, `source`, and `row_counts`.
- [x] Add Worker `scheduled(controller, env, ctx)` handler.
- [x] Scheduled handler writes `reference/latest.json`.
- [x] Scheduled handler writes `reference/archive/{generated_at}.json`.
- [x] `generated_at` object key uses safe UTC format, e.g. `2026-06-19T02-10-00Z`.
- [x] R2 writes use `content-type: application/json; charset=utf-8`.
- [x] Add `GET /v1/export/latest`.
- [x] If no R2 snapshot exists, `GET /v1/export/latest` returns `503 export_unavailable`.

## Never Export

- [x] `submissions`
- [x] `change_log`
- [x] `quotes`
- [x] `deliveries`
- [x] `tracking_events`
- [x] `provider_accounts`
- [x] `provider_booking_tasks`
- [x] legacy contact fields
- [x] provider/customer handoff details

## Tests

- [x] `GET /v1/export` includes metadata and row counts.
- [x] Export contains only allowlisted tables.
- [x] Export contains reference tables only.
- [x] `GET /v1/export/latest` returns `503` before first snapshot.
- [x] Scheduled snapshot writes latest key.
- [x] Scheduled snapshot writes archive key.

## Docs

- [x] Update `docs/contribute-data.md` with public export usage.
- [x] Update `docs/deploy-worker.md` with R2 binding and cron setup.

## Exit Criteria

- [x] Public user can fetch live reference export.
- [x] Public user can fetch latest generated snapshot after first cron run.
- [x] Export leak tests pass.

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

- [ ] Keep hardcoded allowlist:

```ts
const REFERENCE_TABLES = ["zones", "modes", "providers", "rates", "freshness"] as const;
```

- [ ] Add `export_version`, `source`, and `row_counts`.
- [ ] Add Worker `scheduled(controller, env, ctx)` handler.
- [ ] Scheduled handler writes `reference/latest.json`.
- [ ] Scheduled handler writes `reference/archive/{generated_at}.json`.
- [ ] `generated_at` object key uses safe UTC format, e.g. `2026-06-19T02-10-00Z`.
- [ ] R2 writes use `content-type: application/json; charset=utf-8`.
- [ ] Add `GET /v1/export/latest`.
- [ ] If no R2 snapshot exists, `GET /v1/export/latest` returns `503 export_unavailable`.

## Never Export

- [ ] `submissions`
- [ ] `change_log`
- [ ] `quotes`
- [ ] `deliveries`
- [ ] `tracking_events`
- [ ] `provider_accounts`
- [ ] `provider_booking_tasks`
- [ ] legacy contact fields
- [ ] provider/customer handoff details

## Tests

- [ ] `GET /v1/export` includes metadata and row counts.
- [ ] Export contains only allowlisted tables.
- [ ] Export contains reference tables only.
- [ ] `GET /v1/export/latest` returns `503` before first snapshot.
- [ ] Scheduled snapshot writes latest key.
- [ ] Scheduled snapshot writes archive key.

## Docs

- [ ] Update `docs/contribute-data.md` with public export usage.
- [ ] Update `docs/deploy-worker.md` with R2 binding and cron setup.

## Exit Criteria

- [ ] Public user can fetch live reference export.
- [ ] Public user can fetch latest generated snapshot after first cron run.
- [ ] Export leak tests pass.

# 02 - Moderation Backend

Purpose: make reference-data moderation strict, auditable, and usable by the moderator UI.

## Files

- `packages/worker/src/moderation.ts`
- `packages/worker/src/index.ts`
- `packages/worker/src/auth.ts`
- `packages/worker/src/validation.ts`
- `packages/worker/tests/moderation.spec.ts`
- `packages/worker/tests/index.spec.ts`
- `docs/contribute-data.md`

## Existing Tables

- `submissions`
- `change_log`

No migration is required for this track unless implementation discovers a missing index.

## Behavior Contract

### Submission Operations

- [x] `create` approval fails with `409 row_exists` if the target row exists.
- [x] `update` approval fails with `404 row_missing` if the target row does not exist.
- [x] Approval applies reference-data change, writes `change_log`, and marks submission `approved` atomically with D1 `batch()`.
- [x] Rejection marks submission `rejected` and never writes `change_log`.
- [x] Reject requires non-empty `note`.
- [x] Reviewing a non-pending submission returns `409 already_reviewed`.

### Validation

Rates:

- [x] `provider_id`, `origin_zone_id`, `destination_zone_id` are required.
- [x] Provider exists.
- [x] Origin and destination zones exist.
- [x] `base_cost_kes` and `cost_per_kg_kes` are non-negative integers.
- [x] `est_time` is non-empty.
- [x] `max_weight_kg` is `null` or positive.
- [x] `collection_type` is `office_pickup` or `door_delivery`.
- [x] `source` is non-empty.

Zones:

- [x] `id`, `name`, `type`, `town`, `county` are required.
- [x] `id` matches `^ZONE_[A-Z0-9]+_(CBD|STG|RES)_[0-9]{2}$`.
- [x] `type` is `cbd_hub`, `stage`, or `residential_area`.
- [x] `lat` and `lng` are both present or both `null`.
- [x] If present, `lat` is between `-5` and `5`.
- [x] If present, `lng` is between `33` and `42`.

Providers:

- [x] `id`, `name`, `type` are required.
- [x] `id` matches `^[a-z][a-z0-9_]*$`.
- [x] `type` exists in `modes`.
- [x] `reliability_score` is `null` or `0..1`.

Modes:

- [x] `id`, `label`, `source` are required.
- [x] `id` matches `^[a-z][a-z0-9_]*$`.
- [x] `description` is `null` or string.

## Routes

Existing routes to preserve:

- `POST /v1/submissions`
- `GET /v1/submissions`
- `POST /v1/submissions/{id}/approve`
- `POST /v1/submissions/{id}/reject`

Add:

- [x] `GET /v1/submissions/{id}`
- [x] `GET /v1/change-log?target=&row_key=&limit=`

### `GET /v1/submissions/{id}`

Moderator-only response:

```json
{
  "submission": {
    "id": "sub_0123456789abcdef01234567",
    "target": "rates",
    "operation": "update",
    "payload": {},
    "source": "called Mololine parcel desk on 2026-06-19",
    "submitted_by": "Mololine Nakuru desk",
    "status": "pending",
    "submitted_at": "2026-06-19T09:00:00.000Z",
    "reviewed_by": null,
    "reviewed_at": null,
    "review_note": null
  },
  "current_row": null
}
```

`current_row` is `null` only when the target row does not exist.

### `GET /v1/change-log`

Moderator-only response:

```json
{
  "changes": [
    {
      "id": 42,
      "target": "rates",
      "operation": "update",
      "row_key": "mololine|ZONE_NBI_CBD_01|ZONE_NKR_STG_01",
      "before": { "base_cost_kes": 400 },
      "after": { "base_cost_kes": 450 },
      "source": "called Mololine parcel desk on 2026-06-19",
      "changed_by": "moderator-1",
      "submission_id": "sub_0123456789abcdef01234567",
      "changed_at": "2026-06-19T09:10:00.000Z"
    }
  ]
}
```

`before` and `after` are JSON objects in API responses. They remain JSON strings in D1.

## Error Contract

| Situation | HTTP status | `error.code` |
| --- | --- | --- |
| Missing/invalid moderator token | `401` | `unauthorized` |
| Unknown submission | `404` | `not_found` |
| Create targets existing row | `409` | `row_exists` |
| Update targets missing row | `404` | `row_missing` |
| Reviewed twice | `409` | `already_reviewed` |
| Reject without note | `400` | `invalid_request` |
| Payload validation failure | `400` | `invalid_request` |

## Tests

- [x] create new row succeeds.
- [x] create existing row fails.
- [x] update existing row succeeds with before snapshot.
- [x] update missing row fails.
- [x] rejected submission does not alter reference data.
- [x] double review fails.
- [x] invalid foreign keys fail.
- [x] missing moderator token returns `401`.
- [x] invalid moderator token returns `401`.
- [x] valid moderator token records mapped moderator id.

## Exit Criteria

- [x] Moderator can fetch queue and submission detail.
- [x] Moderator can inspect current row.
- [x] Moderator can approve/reject with strict semantics.
- [x] `change_log` provides before/after/source/reviewer/submission id.
- [x] `pnpm --filter @itafika/worker test` passes.

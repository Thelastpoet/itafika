# 06 - Provider Booking Confirmation

Purpose: complete the human-in-the-loop adapter flow for providers with portal access.

## Files

- `spec/openapi.yaml`
- `packages/core/src/types.gen.ts`
- `packages/core/src/types.ts`
- `packages/core/src/tracking.ts`
- `packages/core/tests/tracking.test.ts`
- `packages/worker/migrations/0013_expand_tracking_statuses.sql`
- `packages/worker/migrations/0014_provider_booking_tasks.sql`
- `packages/worker/src/index.ts`
- `packages/worker/src/delivery-service.ts`
- `packages/worker/src/db.ts`
- `packages/worker/src/policy.ts`
- `packages/worker/tests/provider-bookings.spec.ts`
- `docs/integration-guide.md`
- `apps/portal/src/routes/ProviderBookings.tsx`
- `apps/portal/src/routes/ProviderBookingDetail.tsx`
- `apps/portal/src/api.ts`

## Delivery Boundary

Itafika stores delivery orchestration state. The shop stores customer/order/contact data and controls any customer-specific handoff details.

Delivery booking uses:

- `quote_id`
- `shop_order_ref`
- optional `shop_handoff_url`

Provider booking detail shows route, quote, shop reference, and handoff link.

## Public Tracking Statuses

Update `TrackingStatus` to:

```yaml
enum:
  - booking_requested
  - booking_confirmed
  - package_picked
  - in_transit
  - at_sorting_hub
  - ready_for_pickup
  - delivered
  - delivery_cancelled
```

Flow:

```text
booking_requested
  -> booking_confirmed
  -> package_picked
  -> in_transit
  -> at_sorting_hub
  -> ready_for_pickup
  -> delivered

booking_requested -> delivery_cancelled
booking_confirmed -> delivery_cancelled
```

Rules:

- [x] `delivered` is terminal.
- [x] `delivery_cancelled` is terminal.
- [x] Status cannot move backward.
- [x] Physical tracking statuses cannot be appended before task acceptance.

## Migration 0013

Create `packages/worker/migrations/0013_expand_tracking_statuses.sql`.

It must:

- [x] Rebuild `deliveries` with expanded status `CHECK`.
- [x] Rebuild `tracking_events` with expanded status `CHECK`.
- [x] Preserve all existing columns.
- [x] Preserve `tracking_events.source`.
- [x] Add nullable `shop_order_ref TEXT`.
- [x] Add nullable `shop_handoff_url TEXT`.
- [x] Recreate `idx_tracking_events_delivery`.

Use the existing table-rebuild style from `0010_reliability_optional.sql`.

## Migration 0014

Create `packages/worker/migrations/0014_provider_booking_tasks.sql`:

```sql
CREATE TABLE provider_booking_tasks (
  id                   TEXT PRIMARY KEY,
  delivery_tracking_id TEXT NOT NULL REFERENCES deliveries(tracking_id),
  provider_id           TEXT NOT NULL REFERENCES providers(id),
  provider_ref          TEXT,
  status                TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at            TEXT NOT NULL,
  expires_at            TEXT NOT NULL,
  responded_at          TEXT,
  responded_by          TEXT REFERENCES provider_accounts(id),
  response_note         TEXT,
  UNIQUE (delivery_tracking_id)
);

CREATE INDEX idx_provider_booking_tasks_provider
  ON provider_booking_tasks (provider_id, status, created_at);
```

## ID Policy

In `packages/worker/src/policy.ts`:

- [x] Add `createProviderBookingTaskId()` returning `pbt_<24 hex>`.
- [x] Add `PROVIDER_BOOKING_TASK_ID_RE = /^pbt_[a-f0-9]{24}$/`.

## Booking Creation

When `POST /v1/deliveries` books a quote:

- [x] Accept `quote_id`, `shop_order_ref`, and optional `shop_handoff_url`.
- [x] Active Phase 2 contract succeeds with `quote_id` and `shop_order_ref`.
- [x] Create delivery with status `booking_requested`.
- [x] Append tracking event `booking_requested` with source `booking`.
- [x] If provider has an active account, create `provider_booking_tasks` row:
  - `status = pending`
  - `expires_at = created_at + 24 hours`
- [x] If provider has no active account, preserve static adapter behavior:
  - call adapter runtime
  - store `provider_ref`
  - append `booking_confirmed`
  - append `package_picked`

## Provider Routes

Add:

- [x] `GET /v1/provider/bookings`
- [x] `GET /v1/provider/bookings/{id}`
- [x] `POST /v1/provider/bookings/{id}/accept`
- [x] `POST /v1/provider/bookings/{id}/reject`
- [x] `POST /v1/provider/bookings/{id}/events`

### List Response

```json
{
  "bookings": [
    {
      "id": "pbt_0123456789abcdef01234567",
      "tracking_id": "trk_0123456789abcdef0123456789abcdef",
      "status": "pending",
      "created_at": "2026-06-19T09:00:00.000Z",
      "expires_at": "2026-06-20T09:00:00.000Z"
    }
  ]
}
```

### Detail Response

```json
{
  "booking": {
    "id": "pbt_0123456789abcdef01234567",
    "tracking_id": "trk_0123456789abcdef0123456789abcdef",
    "status": "pending",
    "created_at": "2026-06-19T09:00:00.000Z",
    "expires_at": "2026-06-20T09:00:00.000Z",
    "responded_at": null,
    "response_note": null
  },
  "delivery": {
    "tracking_id": "trk_0123456789abcdef0123456789abcdef",
    "status": "booking_requested",
    "shop_order_ref": "ORDER-12345",
    "shop_handoff_url": "https://shop.example.com/delivery-handoff/ORDER-12345"
  },
  "quote": {
    "provider_name": "Mololine Sacco",
    "origin_zone_id": "ZONE_NBI_CBD_01",
    "destination_zone_id": "ZONE_NKR_STG_01",
    "estimated_cost_kes": 450,
    "estimated_time": "3 hours"
  }
}
```

## Action Rules

Accept:

- [x] Only pending task can be accepted.
- [x] Marks task `accepted`.
- [x] Sets delivery status `booking_confirmed`.
- [x] Appends `booking_confirmed` event with source `provider`.

Reject:

- [x] Requires non-empty `note`.
- [x] Only pending task can be rejected.
- [x] Marks task `rejected`.
- [x] Sets delivery status `delivery_cancelled`.
- [x] Appends `delivery_cancelled` event with source `provider`.

Events:

- [x] Only accepted task can append physical tracking statuses.
- [x] Allowed statuses: `package_picked`, `in_transit`, `at_sorting_hub`, `ready_for_pickup`, `delivered`.

Access:

- [x] Provider only sees own tasks.
- [x] Out-of-scope task id returns `404 not_found`.

## Error Contract

| Situation | HTTP status | `error.code` |
| --- | --- | --- |
| Missing/invalid provider token | `401` | `unauthorized` |
| Unknown/out-of-scope task | `404` | `not_found` |
| Non-pending accept/reject | `409` | `invalid_task_state` |
| Reject without note | `400` | `invalid_request` |
| Event before acceptance | `409` | `invalid_task_state` |
| Invalid status transition | `409` | `invalid_status_transition` |

## Portal Work

- [x] `ProviderBookings.tsx` lists tasks by status.
- [x] `ProviderBookingDetail.tsx` displays exact detail response fields.
- [x] Accept button calls accept route.
- [x] Reject button requires note.
- [x] Tracking form appears only after acceptance.

## Tests

- [x] provider-backed booking creates pending task.
- [x] static provider without account keeps existing adapter behavior.
- [x] delivery booking accepts `shop_order_ref`.
- [x] delivery booking succeeds with `shop_order_ref` only.
- [x] provider can see own tasks.
- [x] provider task access is scoped to the assigned provider.
- [x] accept updates task and public tracking.
- [x] reject requires note and cancels delivery.
- [x] physical event before acceptance fails.
- [x] status order enforced.

## Exit Criteria

- [x] Public tracking supports new statuses.
- [x] Provider can accept/reject booking online.
- [x] Provider booking detail uses shop reference and handoff URL.
- [x] Provider tracking updates appear in public tracking history.
- [x] Provider isolation tests pass.

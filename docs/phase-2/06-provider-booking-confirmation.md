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

- [ ] `delivered` is terminal.
- [ ] `delivery_cancelled` is terminal.
- [ ] Status cannot move backward.
- [ ] Physical tracking statuses cannot be appended before task acceptance.

## Migration 0013

Create `packages/worker/migrations/0013_expand_tracking_statuses.sql`.

It must:

- [ ] Rebuild `deliveries` with expanded status `CHECK`.
- [ ] Rebuild `tracking_events` with expanded status `CHECK`.
- [ ] Preserve all existing columns.
- [ ] Preserve `tracking_events.source`.
- [ ] Add nullable `shop_order_ref TEXT`.
- [ ] Add nullable `shop_handoff_url TEXT`.
- [ ] Recreate `idx_tracking_events_delivery`.

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

- [ ] Add `createProviderBookingTaskId()` returning `pbt_<24 hex>`.
- [ ] Add `PROVIDER_BOOKING_TASK_ID_RE = /^pbt_[a-f0-9]{24}$/`.

## Booking Creation

When `POST /v1/deliveries` books a quote:

- [ ] Accept `quote_id`, `shop_order_ref`, and optional `shop_handoff_url`.
- [ ] Active Phase 2 contract succeeds with `quote_id` and `shop_order_ref`.
- [ ] Create delivery with status `booking_requested`.
- [ ] Append tracking event `booking_requested` with source `booking`.
- [ ] If provider has an active account, create `provider_booking_tasks` row:
  - `status = pending`
  - `expires_at = created_at + 24 hours`
- [ ] If provider has no active account, preserve static adapter behavior:
  - call adapter runtime
  - store `provider_ref`
  - append `booking_confirmed`
  - append `package_picked`

## Provider Routes

Add:

- [ ] `GET /v1/provider/bookings`
- [ ] `GET /v1/provider/bookings/{id}`
- [ ] `POST /v1/provider/bookings/{id}/accept`
- [ ] `POST /v1/provider/bookings/{id}/reject`
- [ ] `POST /v1/provider/bookings/{id}/events`

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

- [ ] Only pending task can be accepted.
- [ ] Marks task `accepted`.
- [ ] Sets delivery status `booking_confirmed`.
- [ ] Appends `booking_confirmed` event with source `provider`.

Reject:

- [ ] Requires non-empty `note`.
- [ ] Only pending task can be rejected.
- [ ] Marks task `rejected`.
- [ ] Sets delivery status `delivery_cancelled`.
- [ ] Appends `delivery_cancelled` event with source `provider`.

Events:

- [ ] Only accepted task can append physical tracking statuses.
- [ ] Allowed statuses: `package_picked`, `in_transit`, `at_sorting_hub`, `ready_for_pickup`, `delivered`.

Access:

- [ ] Provider only sees own tasks.
- [ ] Out-of-scope task id returns `404 not_found`.

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

- [ ] `ProviderBookings.tsx` lists tasks by status.
- [ ] `ProviderBookingDetail.tsx` displays exact detail response fields.
- [ ] Accept button calls accept route.
- [ ] Reject button requires note.
- [ ] Tracking form appears only after acceptance.

## Tests

- [ ] provider-backed booking creates pending task.
- [ ] static provider without account keeps existing adapter behavior.
- [ ] delivery booking accepts `shop_order_ref`.
- [ ] delivery booking succeeds with `shop_order_ref` only.
- [ ] provider can see own tasks.
- [ ] provider task access is scoped to the assigned provider.
- [ ] accept updates task and public tracking.
- [ ] reject requires note and cancels delivery.
- [ ] physical event before acceptance fails.
- [ ] status order enforced.

## Exit Criteria

- [ ] Public tracking supports new statuses.
- [ ] Provider can accept/reject booking online.
- [ ] Provider booking detail uses shop reference and handoff URL.
- [ ] Provider tracking updates appear in public tracking history.
- [ ] Provider isolation tests pass.

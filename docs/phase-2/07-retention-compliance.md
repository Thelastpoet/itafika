# 07 - Customer Data Boundary and Compliance Controls

Purpose: align the reference Worker with ADR 0025 so active Phase 2 delivery booking uses orchestration metadata and shop-owned references.

## Files

- `packages/worker/migrations/0015_delivery_boundary_cleanup.sql`
- `packages/worker/src/index.ts`
- `packages/worker/src/db.ts`
- `packages/worker/tests/delivery-boundary.spec.ts`
- `docs/release-checklist.md`
- `docs/deploy-worker.md`
- `docs/status.md`
- `docs/phase-2/00-decisions.md`

## Migration

Create `0015_delivery_boundary_cleanup.sql`.

Add active orchestration fields:

- [x] `deliveries.shop_order_ref TEXT`
- [x] `deliveries.shop_handoff_url TEXT`

Make legacy contact columns nullable where required for cleanup:

- [x] `sender_name`
- [x] `sender_phone`
- [x] `recipient_name`
- [x] `recipient_phone`
- [x] `package_description`

Existing optional identity/instruction columns can remain nullable.

Use table rebuilds if SQLite/D1 cannot alter nullability directly.

## Cleanup Job

Run cleanup after export in the same daily scheduled handler.

Rules:

- [x] Mark pending provider tasks as `expired` when `expires_at < now`.
- [x] For expired tasks, set linked delivery to `delivery_cancelled`.
- [x] For expired tasks, append `delivery_cancelled` tracking event with source `provider`.
- [x] Delete unused quotes older than 7 days where no delivery references them.
- [x] For deliveries in `delivered` or `delivery_cancelled`, redact legacy contact fields after active flow no longer reads them.
- [x] Keep provider/customer-specific handoff details in the shop/provider systems.
- [x] Keep `tracking_events.note` free of customer contact data.
- [x] Keep `provider_booking_tasks.response_note` free of customer contact data.
- [x] Delete rejected submissions older than 365 days.
- [x] For approved submissions older than 365 days, keep `change_log` and delete or redact private submission row.

Use this redaction marker where a column cannot be `NULL`:

```text
[redacted-retention]
```

## Legacy Fields to Redact

- [x] `deliveries.sender_name`
- [x] `deliveries.sender_phone`
- [x] `deliveries.sender_id_number`
- [x] `deliveries.recipient_name`
- [x] `deliveries.recipient_phone`
- [x] `deliveries.recipient_id_number`
- [x] `deliveries.alternate_collector_name`
- [x] `deliveries.alternate_collector_phone`
- [x] `deliveries.alternate_collector_id_number`
- [x] `deliveries.instructions`
- [x] `deliveries.package_description`

## Active Delivery Fields

- [x] `deliveries.shop_order_ref`
- [x] `deliveries.shop_handoff_url`
- [x] `deliveries.tracking_id`
- [x] `deliveries.quote_id`
- [x] `deliveries.status`
- [x] `deliveries.provider_ref`
- [x] `deliveries.created_at`

## Compliance Release Gate

Update `docs/release-checklist.md` with:

- [x] ODPC registration status recorded.
- [x] ADR 0025 boundary recorded.
- [x] Legacy contact-field cleanup implemented and tested.
- [x] Provider access controls tested.
- [x] Export leak tests pass.
- [x] Maintainer approval recorded before public provider launch.

## Tests

- [x] expired provider task becomes `expired`.
- [x] expired provider task cancels linked delivery.
- [x] expired provider task appends cancellation event.
- [x] expired unused quotes older than 7 days are deleted.
- [x] used quotes are not deleted independently of linked delivery.
- [x] active delivery booking stores `shop_order_ref`.
- [x] active delivery booking accepts optional `shop_handoff_url`.
- [x] active delivery booking succeeds with `shop_order_ref` only.
- [x] provider booking detail returns active orchestration fields.
- [x] legacy contact fields are redacted by cleanup.
- [x] rejected submissions older than 365 days are deleted.
- [x] approved submissions keep `change_log` provenance.
- [x] public export remains reference-table only.

## Exit Criteria

- [x] Active delivery flow follows ADR 0025.
- [x] Cleanup runs from scheduled handler.
- [x] Delivery boundary tests pass.
- [x] Compliance release checklist exists.
- [x] Public provider launch is blocked until maintainer approval is recorded.

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

- [ ] `deliveries.shop_order_ref TEXT`
- [ ] `deliveries.shop_handoff_url TEXT`

Make legacy contact columns nullable where required for cleanup:

- [ ] `sender_name`
- [ ] `sender_phone`
- [ ] `recipient_name`
- [ ] `recipient_phone`
- [ ] `package_description`

Existing optional identity/instruction columns can remain nullable.

Use table rebuilds if SQLite/D1 cannot alter nullability directly.

## Cleanup Job

Run cleanup after export in the same daily scheduled handler.

Rules:

- [ ] Mark pending provider tasks as `expired` when `expires_at < now`.
- [ ] For expired tasks, set linked delivery to `delivery_cancelled`.
- [ ] For expired tasks, append `delivery_cancelled` tracking event with source `provider`.
- [ ] Delete unused quotes older than 7 days where no delivery references them.
- [ ] For deliveries in `delivered` or `delivery_cancelled`, redact legacy contact fields after active flow no longer reads them.
- [ ] Keep provider/customer-specific handoff details in the shop/provider systems.
- [ ] Keep `tracking_events.note` free of customer contact data.
- [ ] Keep `provider_booking_tasks.response_note` free of customer contact data.
- [ ] Delete rejected submissions older than 365 days.
- [ ] For approved submissions older than 365 days, keep `change_log` and delete or redact private submission row.

Use this redaction marker where a column cannot be `NULL`:

```text
[redacted-retention]
```

## Legacy Fields to Redact

- [ ] `deliveries.sender_name`
- [ ] `deliveries.sender_phone`
- [ ] `deliveries.sender_id_number`
- [ ] `deliveries.recipient_name`
- [ ] `deliveries.recipient_phone`
- [ ] `deliveries.recipient_id_number`
- [ ] `deliveries.alternate_collector_name`
- [ ] `deliveries.alternate_collector_phone`
- [ ] `deliveries.alternate_collector_id_number`
- [ ] `deliveries.instructions`
- [ ] `deliveries.package_description`

## Active Delivery Fields

- [ ] `deliveries.shop_order_ref`
- [ ] `deliveries.shop_handoff_url`
- [ ] `deliveries.tracking_id`
- [ ] `deliveries.quote_id`
- [ ] `deliveries.status`
- [ ] `deliveries.provider_ref`
- [ ] `deliveries.created_at`

## Compliance Release Gate

Update `docs/release-checklist.md` with:

- [ ] ODPC registration status recorded.
- [ ] ADR 0025 boundary recorded.
- [ ] Legacy contact-field cleanup implemented and tested.
- [ ] Provider access controls tested.
- [ ] Export leak tests pass.
- [ ] Maintainer approval recorded before public provider launch.

## Tests

- [ ] expired provider task becomes `expired`.
- [ ] expired provider task cancels linked delivery.
- [ ] expired provider task appends cancellation event.
- [ ] expired unused quotes older than 7 days are deleted.
- [ ] used quotes are not deleted independently of linked delivery.
- [ ] active delivery booking stores `shop_order_ref`.
- [ ] active delivery booking accepts optional `shop_handoff_url`.
- [ ] active delivery booking succeeds with `shop_order_ref` only.
- [ ] provider booking detail returns active orchestration fields.
- [ ] legacy contact fields are redacted by cleanup.
- [ ] rejected submissions older than 365 days are deleted.
- [ ] approved submissions keep `change_log` provenance.
- [ ] public export remains reference-table only.

## Exit Criteria

- [ ] Active delivery flow follows ADR 0025.
- [ ] Cleanup runs from scheduled handler.
- [ ] Delivery boundary tests pass.
- [ ] Compliance release checklist exists.
- [ ] Public provider launch is blocked until maintainer approval is recorded.

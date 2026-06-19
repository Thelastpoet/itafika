# ADR 0018 — Historical delivery-contact fields for Phase 1 compatibility

**Status:** Accepted (2026-06-10); active booking boundary superseded by [ADR 0025](0025-delivery-orchestration-boundary.md)
**Date:** 2026-06-09

**Current authority:** ADR 0025 defines the active delivery orchestration contract.
New delivery booking uses `quote_id`, `shop_order_ref`, and optional
`shop_handoff_url`. Shops own customer names, phone numbers, addresses, handover
instructions, and customer-specific collection identity.

## Context

For office pickups, the provider often needs to know who is allowed to collect the parcel and may require an ID number. We also need a way to include simple instructions like "call before handover."

## Historical Decision

This ADR originally added optional fields to the Phase 1 booking request:

- **`instructions`**: Simple notes for the delivery person (e.g., "Give to my sister").
- **`id_number`**: The ID of the person collecting the parcel.
- **`alternate_collector`**: Details of another person authorized to pick up the parcel.

Those fields are now legacy compatibility fields. They do not belong in the active
Phase 2 delivery orchestration API.

## Implementation Guidance

- New public delivery booking follows ADR 0025: `quote_id`, `shop_order_ref`, and
  optional `shop_handoff_url`.
- The OpenAPI `DeliveryRequest`, `Delivery`, and adapter `BookingOrder` do not carry
  shop customer/contact/handover fields in the active contract.
- Existing Worker/database contact fields are legacy compatibility data until the
  Phase 2 delivery-boundary cleanup removes them from active flows.
- Provider portal screens use the shop reference and optional shop handoff URL for
  handoff details chosen by the shop.

## Rationale

- **Makes the booking actionable offline.** The merchant dispatches against a record
  that contains everything the parcel desk needs — no side-channel WhatsApp.
- **Matches how pickup actually works** (name + ID + sometimes a proxy), without
  forcing it where it doesn't apply (door delivery, low-value parcels).
- **Additive.** No break to the `/v1` delivery contract.

## Options considered

- **Overload `package_description` for instructions.** Rejected — conflates contents
  with handover instructions; the two are read by different people for different
  reasons.
- **A free-form metadata bag (`metadata: object`).** Rejected for now — too loose to
  build reliable handover UX on; named fields set clearer expectations. A general
  metadata field can be argued separately later if shops need it.
- **Require ID for all office pickups.** Rejected — not every desk demands it and
  not every customer has it to hand; keep it optional and let providers/shops decide.

## Consequences

- Active OpenAPI delivery booking follows ADR 0025's orchestration boundary.
- The adapter contract uses shop-owned references for provider handoff.
- Legacy contact fields are cleanup targets, not fields for new features.
- Customer-specific handoff details stay in the shop-owned commerce/handoff flow.

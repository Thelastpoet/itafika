# ADR 0018 — Collect delivery notes and ID info

**Status:** Accepted (2026-06-10)
**Date:** 2026-06-09

## Context

For office pickups, the provider often needs to know who is allowed to collect the parcel and may require an ID number. We also need a way to include simple instructions like "call before handover."

## Decision

We will add optional fields to the booking request:

- **`instructions`**: Simple notes for the delivery person (e.g., "Give to my sister").
- **`id_number`**: The ID of the person collecting the parcel.
- **`alternate_collector`**: Details of another person authorized to pick up the parcel.

All optional; the existing required fields (`quote_id`, `sender`, `recipient`) are
unchanged. `package_description` keeps its meaning (what's in the box);
`instructions` is distinct (what to do at handover).

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

- The OpenAPI `DeliveryRequest`/`Delivery` gain `instructions`; `Contact` gains
  optional `id_number`; `DeliveryRequest` gains optional `alternate_collector`.
- The adapter contract's `BookingOrder` gains `instructions` and the enriched
  recipient/`alternate_collector` so a human-in-the-loop adapter can relay them.
- These fields are delivery details, not routing facts — they stay out of `Quote`
  and out of the dataset.
- Generated types and the reference Worker need updating (follow-on).

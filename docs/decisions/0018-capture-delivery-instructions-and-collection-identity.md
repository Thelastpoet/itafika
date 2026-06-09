# ADR 0018 — Capture delivery instructions and collection identity

**Status:** Proposed
**Date:** 2026-06-09

> One of four related ADRs (0016–0019) evolving Itafika into a checkout-delivery
> layer. Direction and expectations only — implementation and maintainer sign-off
> per [GOVERNANCE.md](../../GOVERNANCE.md) are follow-on.

## Context

Office-pickup delivery has human realities the booking must carry, or the parcel
gets stuck at the desk:

- **Instructions** — "call before handing over", "give to my sister Achieng".
- **Who collects** — at a SACCO/bus desk the recipient is asked for a name and often
  an **ID number**; sometimes a different person collects on their behalf.

Today `DeliveryRequest` has `sender`, `recipient` (`Contact` = name + phone only),
and `package_description` (about the box, not about delivery). There is **nowhere**
to put a collection instruction, an ID, or an alternate collector. The "give to
so-and-so" requirement — a normal, common Kenyan instruction — has no home.

## Decision

Capture the collection reality on the booking, additively:

- **`instructions`** on `DeliveryRequest` (and echoed on `Delivery`) — free text,
  e.g. "Call before handover; give to Achieng (sister)." Max 500 chars.
- **`id_number`** — optional, added to `Contact` — the ID a parcel desk asks for at
  collection.
- **`alternate_collector`** — optional `Contact` on `DeliveryRequest` — someone other
  than the recipient authorised to collect.

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

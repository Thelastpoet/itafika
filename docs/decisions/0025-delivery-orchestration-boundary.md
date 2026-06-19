# ADR 0025 — Itafika is a delivery orchestration API/control plane

**Status:** Accepted
**Date:** 2026-06-19

**Supersedes:** the booking-contact storage direction in [ADR 0018](0018-capture-delivery-instructions-and-collection-identity.md) and the personal-booking-data assumption in [ADR 0024](0024-data-classification-and-protection.md).

## Context

Itafika exists to help online shops offer delivery at checkout without each shop developer rebuilding local route, provider, stage, and pricing knowledge. Phase 2 adds a provider on-ramp because many matatus, riders, and bus parcel desks have no adapter API. The provider on-ramp gives those providers a universal adapter surface for rates, availability, booking confirmation, and tracking updates.

The product boundary is the orchestration layer between shops and providers:

- Shops own customer, order, cart, payment, and customer-contact data.
- Providers perform the physical delivery and customer handoff.
- Itafika coordinates delivery options, provider selection, provider handoff state, and tracking state.

## Decision

Itafika is a **delivery orchestration API/control plane**.

The default delivery flow stores orchestration data:

- route and zone ids
- provider id
- quote id
- shop order reference
- provider task id
- provider confirmation state
- tracking status
- timestamps
- public reference-data provenance

Shops keep customer names, phone numbers, addresses, handover instructions, cart/order contents, and customer-specific collection identity in their commerce systems.

Provider handoff uses shop-controlled references:

- `shop_order_ref`: a shop-owned opaque order/delivery reference.
- `shop_handoff_url`: an optional shop-owned URL where an authenticated provider can get the handoff details the shop chooses to share.

Itafika stores the reference and URL as orchestration metadata. The shop controls the customer data behind that URL.

## Consequences

- Phase 2 implementation updates the public delivery contract so new delivery booking uses `shop_order_ref` and optional `shop_handoff_url`.
- Existing delivery contact columns in the reference Worker are legacy compatibility data. Phase 2 migrates active flows away from them and excludes them from provider portal responses.
- Provider portal booking screens show route, provider task state, quote facts, shop reference, and optional shop handoff link.
- Public export remains reference-data only.
- Compliance work focuses on keeping customer data outside Itafika's active storage model and cleaning up legacy contact fields in the reference Worker.

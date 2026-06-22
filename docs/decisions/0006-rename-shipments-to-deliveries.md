# ADR 0006: Rename "shipment" to "delivery"

**Status:** Accepted
**Date:** 2026-06-08

## Context

The initial API used "shipment" for booked jobs. This felt too generic and didn't fit the Kenyan context of the project. "Delivery" is a better fit for how people talk about sending parcels.

## Decision

Rename "shipment" to **"delivery"** everywhere in the spec and code.

- Paths: `/v1/shipments` → `/v1/deliveries`
- Schemas: `Shipment` → `Delivery`
- Operation IDs: `createShipment` → `createDelivery`
- All documentation and implementation code updated.

The term "tracking" remains unchanged.

## Rationale

- **Consistency of language.** "Delivery" matches the product framing ("delivery as something you consume") and the surrounding Kenyan-grounded vocabulary better than "shipment".
- **Cheap now, expensive later.** No client builds against `/v1` yet and the implementation is pre-release, so the rename is a search-and-replace today. Once shops integrate, it would be a breaking `/v2` change with a deprecation window.
- **Spec-first.** The change was made in `spec/` first; generated types and the Worker follow.

## Options considered

- **Keep "shipment".** Rejected: the whole point is that the standard's language should fit Kenyan delivery, and this was the moment to fix it for free.
- **"consignment", "parcel", "dispatch".** Considered. "Parcel" names the item, not the booking; "consignment"/"dispatch" are more jargon than the audience (shop owners, domain experts) needs. "Delivery" is the clearest fit for the consumer-facing framing.

## Consequences

- ADRs 0001 and 0003 mention a "shipments" D1 table in their accepted text. ADRs are immutable once accepted; they are not edited. This ADR is the authority on the current name: read "shipments" there as the resource now called "deliveries".
- Within `/v1` the change is a straight rename made before any consumer exists; there is no deprecation obligation. Any future rename after adoption would require a `/v2` and a deprecation window per GOVERNANCE.md.
- The reference implementation's `deliveries` table, handlers, types, and tests use the new name.

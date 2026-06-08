# ADR 0006 — Rename the booking resource from "shipment" to "delivery"

**Status:** Accepted
**Date:** 2026-06-08

## Context

The Phase 1 contract modelled the booked job — a selected quote, locked in, with a tracking ID and a status lifecycle — as a **shipment**: `POST /v1/shipments`, `GET /v1/shipments/{tracking_id}/track`, and the `Shipment` / `ShipmentRequest` schemas.

"Shipment" reads as generic, American/mainstream logistics vocabulary. It sits oddly next to the rest of Itafika's language, which is deliberately Kenyan and grounded in how parcels actually move — stages, SACCOs, matatu and bus parcel desks. The project's name itself is *Itafika* ("it will arrive"), and the product framing is **delivery as something you consume**. The resource noun should match that framing.

This is a change to endpoint paths, schema names, and types, so per GOVERNANCE.md it is a **spec change**: it starts in `spec/`, carries an ADR, and the implementation follows.

## Decision

Rename the booking resource from **shipment** to **delivery** throughout the standard and the reference implementation.

- Paths: `/v1/shipments` → `/v1/deliveries`; `/v1/shipments/{tracking_id}/track` → `/v1/deliveries/{tracking_id}/track`.
- Schemas: `Shipment` → `Delivery`; `ShipmentRequest` → `DeliveryRequest`.
- OpenAPI tag `Shipments` → `Deliveries`; operationIds `createShipment` → `createDelivery`, `trackShipment` → `trackDelivery`.
- Prose in `spec/openapi.yaml`, `spec/adapter-contract.md`, the concept doc, README, and CONTRIBUTING updated to match.

`tracking_id` and the tracking vocabulary are unchanged — tracking is universal and reads naturally regardless of the resource name. The five universal `TrackingStatus` values are unchanged.

The reference implementation uses `deliveries` for its D1 table and the corresponding handlers and types.

## Rationale

- **Consistency of language.** "Delivery" matches the product framing ("delivery as something you consume") and the surrounding Kenyan-grounded vocabulary better than "shipment".
- **Cheap now, expensive later.** No client builds against `/v1` yet and the implementation is pre-release, so the rename is a search-and-replace today. Once shops integrate, it would be a breaking `/v2` change with a deprecation window.
- **Spec-first.** The change was made in `spec/` first; generated types and the Worker follow.

## Options considered

- **Keep "shipment".** Rejected — the whole point is that the standard's language should fit Kenyan delivery, and this was the moment to fix it for free.
- **"consignment", "parcel", "dispatch".** Considered. "Parcel" names the item, not the booking; "consignment"/"dispatch" are more jargon than the audience (shop owners, domain experts) needs. "Delivery" is the clearest fit for the consumer-facing framing.

## Consequences

- ADRs 0001 and 0003 mention a "shipments" D1 table in their accepted text. ADRs are immutable once accepted; they are not edited. This ADR is the authority on the current name — read "shipments" there as the resource now called "deliveries".
- Within `/v1` the change is a straight rename made before any consumer exists; there is no deprecation obligation. Any future rename after adoption would require a `/v2` and a deprecation window per GOVERNANCE.md.
- The reference implementation's `deliveries` table, handlers, types, and tests use the new name.

# ADR 0024 — Data classification & protection for reference export

**Status:** Accepted, partially superseded by [ADR 0025](0025-delivery-orchestration-boundary.md)
**Date:** 2026-06-15

## Context

Itafika promises an open reference dataset anyone can download. [ADR 0025](0025-delivery-orchestration-boundary.md)
sets the active delivery boundary: shops own customer/order/contact data, providers
handle fulfillment, and Itafika stores delivery orchestration state.

This ADR sets the reference export boundary that the storage decision
([ADR 0023](0023-data-lives-in-d1-not-git.md)) and the provider tool
([ADR 0022](0022-itafika-builds-the-provider-supply-layer.md)) obey.

## Decision

Itafika data is classified by purpose.

**Reference data — open and exportable.**
Zones, routes, rates, modes, provider registry, and coverage. These are operational
facts about delivery options and provider supply. This is the open, forkable foundation;
the public export reads from here.

**Orchestration data — operational and private.**
Quote ids, tracking ids, provider task ids, shop references, handoff URLs, confirmation
states, tracking states, timestamps, and audit metadata. This powers the checkout
delivery flow and provider handoff.

The separation is **structural, not procedural**: the public export job is
**allowlist-only over reference tables**. The schema boundary is the control.

## Obligations this imposes

- **Reference export allowlist.** Public export reads only reference tables.
- **Shop-owned customer data.** Active delivery booking uses shop references and optional
  shop handoff URLs under ADR 0025.
- **Provider registry hygiene.** Public provider registry entries use provider/business
  identities appropriate for an open reference dataset.
- **Operational access control.** Provider task data is private to the assigned provider
  and Itafika moderation/operations surfaces.

## Rejected options

### Treat every table as public export data

Rejected — openness applies to reference data.

### Rely on review/discipline to keep exports clean

Rejected — export safety is structural through an allowlist over reference tables.

## Consequences

- The public export surfaces reference data only.
- Active delivery booking follows ADR 0025's orchestration boundary.
- Legacy contact fields in the reference Worker are cleaned up through the Phase 2
  delivery-boundary track.

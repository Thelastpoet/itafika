# ADR 0024 — Data classification & protection: open reference data vs. regulated personal data

**Status:** Accepted
**Date:** 2026-06-15

## Context

Itafika promises an open dataset anyone can download. It also, once
[ADR 0022](0022-itafika-builds-the-provider-supply-layer.md) lands, handles bookings
containing real people's contact details. "Open data" and "data protection" only
conflict if the two are treated as one bucket. They are not. As repo maintainers we
are responsible that personal data does not fall into the wrong hands, and the **Kenya
Data Protection Act, 2019** governs how we handle it.

This ADR sets the classification rule that the storage decision
([ADR 0023](0023-data-lives-in-d1-not-git.md)) and the provider tool
([ADR 0022](0022-itafika-builds-the-provider-supply-layer.md)) must obey.

## Decision

All Itafika data falls into exactly one of two buckets, with **opposite** handling rules.

**Bucket 1 — Reference data (open, exportable, free).**
Zones, routes, rates, modes, provider registry, coverage. Facts about logistics, not
people. This is the open, forkable foundation; the public export reads from here.

**Bucket 2 — Personal data (regulated, never exported).**
Booking fields — sender/recipient name and phone, addresses, handover instructions,
`alternate_collector` contacts, and tracking tied to an individual. Governed by the
Kenya DPA.

The separation is **structural, not procedural**: the public export job is
**allowlist-only over reference tables**, so a booking field cannot physically leak into
a download. "We'll be careful" is not the control; the schema boundary is.

## Obligations this imposes

- **Data minimization.** Collect only booking fields genuinely needed to move a parcel.
  Audit `BookingOrder` against this; every optional personal field is a liability.
- **Storage limitation / retention.** Booking personal data has a retention policy and is
  auto-deleted after a defined period post-delivery. It is not kept indefinitely.
- **Cross-border transfer.** Cloudflare D1/Workers are globally distributed; the DPA
  restricts transferring Kenyans' personal data abroad. Data residency for Bucket 2 must
  be verified (and pinned if possible) before scale.
- **Controller vs. processor.** Where a shop uses Itafika to handle its customers'
  deliveries, the shop is the data controller and Itafika the processor; this needs a
  processing basis/agreement and shapes liability.
- **Registration & security.** ODPC registration, security safeguards, and breach
  notification likely apply at scale.
- **Scrub the open registry.** No personal mobile numbers in the public `providers`
  registry — business/desk numbers only.

## Rejected options

### Treat the dataset as one openly downloadable whole

Rejected — it would publish personal data and breach the Kenya DPA. The whole point is
that openness applies to Bucket 1 only.

### Rely on review/discipline to keep personal data out of exports

Rejected — humans miss things. The wall must be structural (allowlist over reference
tables), not a habit.

## Consequences

- The public export and open API surface Bucket 1 only.
- Booking storage needs retention/deletion logic and access controls beyond the reference
  data.
- This is not legal advice; a compliance review is required before launch. This ADR
  records the engineering shape that review must confirm.

# What's Next for Itafika?

This document lists the practical tasks we are working on next. It is not a long-term roadmap, just a to-do list for the next few weeks.

## Where We Are Today
The Phase 1 code is mostly finished. Shops can already search for zones, get quotes, book deliveries, and track parcels using our "reference" worker.

**The next big goal is to improve our data and bring real providers onto the universal adapter surface (Phase 2).**

Implementation handoff: [`docs/phase-2/README.md`](phase-2/README.md).

---

## High Priority (Right Now)

### 1. Improve the Data (P1)
Our dataset is the most important part of the project. Today, some of the data is just "placeholder" text to show how it works. We need to replace it with real information.

- **Tasks:**
  - Replace "test" prices with real prices from SACCOs and couriers.
  - Add more towns and stages across Kenya.
  - Make sure every price has a clear "Source" (e.g., "I called Mololine on June 10th").
  - Use D1 freshness records and the change log to flag stale town data; moderators refresh stale rates through the online moderation flow described in the Phase 2 implementation handoff.

### 2. Add a Way for Anyone to Contribute Data (P3)
Right now, you have to know how to use GitHub to add data. We want to make it so anyone, even someone at a stage desk or a provider updating their own rates, can contribute. The mechanism is the provider on-ramp and online moderation described in Phase 2 below (ADRs 0023-0024), not a GitHub pull request.

- **Tasks:**
  - Build an online app where people (and providers) submit a price, route, or stage.
  - Route submissions into a moderation queue that trusted moderators approve online; approved data goes live in D1, with provenance kept in a change log.
  - Keep the dataset open via an automated public export of reference data.

---

## Phase 2 Goals (Growing the System)

Phase 2 grows Itafika as a **delivery orchestration API/control plane** for ecommerce checkout. Most Kenyan providers (SACCOs, bus parcel desks, boda riders) run by phone, desk, or WhatsApp, so Itafika gives them a universal adapter surface for routes, rates, booking confirmation, and tracking updates (ADR 0022 and ADR 0025). The provider tool is the means to make real supply available to shops.

### 1. Provider On-Ramps (ADR 0022)
Two doors, same destination. **Non-technical providers** use a hosted Itafika tool: upload their routes and rates, and receive and confirm bookings. **Technical providers** implement the open adapter contract or self-host. This is the human-in-the-loop ("manual") adapter from the adapter contract, made good: a booking reaches a provider, a human confirms it, and that confirmation becomes the tracking event.

### 2. Move the Data Model to D1 with Online Moderation (ADR 0023)
The CSV → pull request → reseed loop is the wrong tool for provider-owned, changing rates. Data becomes operationally owned by **D1**, contributed through an online app into a **moderation queue**, with provenance kept in an append-only change log. Openness is preserved by an automated public export of reference data, so it stays forkable and auditable: git holds code, not data. This supersedes the form→PR flow (ADR 0020) and the "CSV is source of truth" part of ADR 0003.

### 3. Keep the Customer Data Boundary Clear (ADR 0025)
Shops own customer, order, payment, and contact data. Providers handle the physical handoff. Itafika stores orchestration state: route, provider, quote, shop reference, provider task, confirmation state, and tracking state. Public export stays allowlist-only over reference tables.

### 4. One Live Adapter (Last, Not First)
A small number of couriers do have APIs. One thin live adapter for one of them would make booking end-to-end real for a single lane. That is useful, but those couriers are the segment that needs Itafika least, so this is the tail of Phase 2, not the headline.

Tracking improves the same way: manual events and handoff confirmations first; automatic feeds only where a provider can actually supply them.

---

## What We Finished Recently
We have been busy! Here is what was just completed:
- **Live API:** The worker is now running on Cloudflare.
- **Quote & Booking:** The logic for getting a price and booking a delivery is finished.
- **Tracking Log:** We now have a clean way to show the history of a parcel.
- **Checkout Ready:** Shops can now use Itafika to handle everything from choosing a stage to tracking the package.
- **Validation:** We have tools to automatically check that our CSV data is correct.

---

## What Should Wait
These are good ideas, but we aren't working on them yet:
- Expanding to other countries.
- Adding complex "AI" ranking for couriers.
- Building mobile apps for drivers.

We want to get the basics of Kenyan delivery 100% right first.

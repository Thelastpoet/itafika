# What's Next for Itafika?

This document lists the practical tasks we are working on next. It is not a long-term roadmap—it's a to-do list for the next few weeks.

## Where We Are Today
The Phase 1 code is mostly finished. Shops can already search for zones, get quotes, book deliveries, and track parcels using our "reference" worker.

**The next big goal is to improve our data and start connecting real delivery companies (Phase 2).**

---

## High Priority (Right Now)

### 1. Improve the Data (P1)
Our dataset is the most important part of the project. Today, some of the data is just "placeholder" text to show how it works. We need to replace it with real information.

- **Tasks:**
  - Replace "test" prices with real prices from SACCOs and couriers.
  - Add more towns and stages across Kenya.
  - Make sure every price has a clear "Source" (e.g., "I called Mololine on June 10th").
  - Decide how we will check and update old prices.

### 2. Add a Way for Anyone to Contribute Data (P3)
Right now, you have to know how to use GitHub to add data. We want to make it so anyone—even someone at a stage desk—can contribute.

- **Tasks:**
  - Build a simple online form where people can submit a price or a stage.
  - When someone submits the form, it should automatically create a "Pull Request" on GitHub for us to review.
  - This keeps the data safe but makes it easy for non-developers to help.

---

## Phase 2 Goals (Growing the System)

Phase 2 is about growth, not middleware. Most Kenyan providers — SACCOs, bus parcel desks, boda riders — don't have APIs, and Itafika doesn't wait for them to get one. It meets them where they are.

### 1. Grow the Dataset
More towns, more providers, more verified prices — through the contribution form (ADR 0020) and community pull requests. This is the OpenStreetMap loop, and it is the heart of Phase 2.

### 2. Human-Handoff Booking ("Manual Adapters")
Prove that a booking can reach a provider that has no software: a WhatsApp or SMS message to a SACCO parcel desk or a rider, and a human reply that confirms it. The adapter contract already defines this kind of adapter.

### 3. One Live Adapter (Last, Not First)
A small number of national couriers do have APIs. One thin live adapter for one of them would make booking end-to-end real for a single lane. Useful — but those couriers are the segment that needs Itafika least, so this is the tail of Phase 2, not the headline.

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

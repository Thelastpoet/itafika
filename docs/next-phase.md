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

## Phase 2 Goals (Real Connections)

### 1. Build "Live" Adapters
Right now, our prices come from a CSV file (Static). In Phase 2, we will build "Adapters" that talk directly to the APIs of companies like G4S, Sendy, or others.

### 2. Real-Time Tracking
Instead of manually updating a parcel's status, the API will get updates directly from the delivery company.

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

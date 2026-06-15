# Project Status

This project is currently being built.

This page shows what is currently working and what is still being built. Use it together with these other docs:

- `README.md` — High-level overview.
- `docs/Itafika-Concept-Doc.md` — Long-term vision.
- `docs/next-phase.md` — What we are working on next.
- `spec/` — The technical rules and data format.

## What works now

We have a solid foundation for Phase 1:

- **Project structure:** A organized code repository.
- **Core engine:** The code that calculates delivery options and prices.
- **API:** A working version of the API on Cloudflare.
- **Adapters:** Examples of how to connect to delivery providers.
- **Database:** Tools to manage and search our data.
- **Validation:** Automated checks to make sure our data is correct.
- **Testing:** Automated tests to ensure everything works as expected.
- **Live API:** A version of the API you can try right now.
- **Shop example:** A simple example of an online shop using Itafika.

## What the API can do today

The API supports these actions:

- List all locations (`zones`) and search for them by name.
- See when each town's data was last updated.
- Browse different delivery modes and options for each town.
- Get delivery quotes (prices and times).
- Book a delivery and get a tracking ID.
- Track a parcel and see its history.
- Add manual updates to a delivery.

Current behavior is simple:

- Quotes come from the data we've already added to the system.
- Quotes are valid for 24 hours.
- You can only book a quote once.
- Tracking uses one simple list of statuses for every provider.

## What is still being improved

Some parts of the project are just starting out:

- **Price freshness:** Prices come from the community-maintained dataset. Keeping them fresh is community work — checking prices, updating them, and recording a source for every one.
- **Tracking updates:** Tracking works through booking events and manual updates. Updates confirmed by providers (for example, a parcel desk replying on WhatsApp) come next.
- **Data coverage:** We are still adding more towns and delivery companies. Some data is just for testing right now.

## What is planned for the future

These are big features we want to add as the project grows:

- Connections to more providers — through human handoff (WhatsApp or SMS to a parcel desk) for most, and through APIs for the few couriers that have them.
- Automatic background tasks (like checking for tracking updates).
- Better tools for handling complicated delivery steps and retries.

## Live API

The live API is running here:

`https://itafika-api.emcie4.workers.dev`

If you want to run it on your own computer or deploy it yourself, see [`docs/deploy-worker.md`](deploy-worker.md).

## What we are working on right now

The main Phase 1 features are ready. Now we are focused on:

- **Adding more data:** Replacing test prices with real ones and adding more towns.
- **Easier contribution:** Making it easier for non-developers to share data using a simple form.
- **Human-handoff booking:** Designing how a booking reaches a provider that has no software (for example, a WhatsApp message to a SACCO parcel desk).

## How to contribute

If you are helping out, use these labels so everyone knows what to expect:

- `Working now`
- `Partly ready`
- `Rules set, but not yet built`
- `Planned`

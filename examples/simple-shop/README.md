# Example: simple shop

A short script showing what an online shop does at checkout: resolve the customer's
location to a zone (`/v1/zones/search`), ask Itafika for delivery options between two
zones, show them to the customer, book the chosen one, and read back tracking.

It mirrors the [integration guide](../../docs/integration-guide.md) step for step. For
broader project status, see [`docs/status.md`](../../docs/status.md).

## Run it

Start the reference Worker first (from the repo root):

```bash
pnpm --filter @itafika/worker db:migrate:local
pnpm --filter @itafika/worker db:seed:local
pnpm --filter @itafika/worker dev
```

Then, in another terminal:

```bash
pnpm --filter @itafika/example-simple-shop start
```

Point it at the live Worker with `ITAFIKA_API`, and change the customer's destination
with `DESTINATION`:

```bash
ITAFIKA_API=https://itafika-api.emcie4.workers.dev \
  DESTINATION=Nakuru \
  pnpm --filter @itafika/example-simple-shop start
```

# Example: simple shop

A ~50-line script showing what an online shop does at checkout: ask Itafika for
delivery options between two zones, show them to the customer, book the chosen
one, and read back tracking.

This example matches the current Phase 1 reference Worker. For broader project status, see [`docs/status.md`](../../docs/status.md).

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

Point it at a different instance with `ITAFIKA_API`:

```bash
ITAFIKA_API=https://api.itafika.dev pnpm --filter @itafika/example-simple-shop start
```

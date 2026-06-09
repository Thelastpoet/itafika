# Deploying the Reference Worker

This guide explains how to deploy the current `@itafika/worker` package to Cloudflare.

It is written for maintainers. It assumes the code is already checked out and dependencies are installed.

## What this guide covers

- create the D1 database
- connect the Worker to the real database
- apply migrations remotely
- seed remote data
- deploy the Worker

## Before you start

You need:

- a Cloudflare account
- Wrangler authenticated to that account
- `pnpm install` already run in the repo

Check Wrangler auth:

```bash
pnpm --filter @itafika/worker exec wrangler whoami
```

## 1. Create the D1 database

Create the production database:

```bash
pnpm --filter @itafika/worker exec wrangler d1 create itafika
```

Wrangler will print a database ID.

It will look something like:

```txt
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## 2. Update `wrangler.jsonc`

Open [packages/worker/wrangler.jsonc](/home/manu/development/itafika/packages/worker/wrangler.jsonc).

Replace the placeholder `database_id` with the real value from the previous step.

If you want to use `wrangler dev --remote`, also set `preview_database_id` to the same value or to a separate preview database ID if you have one.

## 3. Apply remote migrations

Run:

```bash
pnpm --filter @itafika/worker db:migrate:remote
```

This applies the SQL migrations in `packages/worker/migrations/` to the remote D1 database.

## 4. Seed the remote database

Run:

```bash
pnpm --filter @itafika/worker db:seed:remote
```

This builds `seed.sql` from the canonical dataset and executes it against the remote D1 database.

## 5. Deploy the Worker

Run:

```bash
pnpm --filter @itafika/worker run deploy
```

## 6. Smoke test the deployment

After deploy, call the Worker URL and confirm the API responds:

```bash
curl https://<your-worker-url>/v1/zones
```

You should get a JSON response with `zones`.

## Local vs remote commands

Local commands:

```bash
pnpm --filter @itafika/worker db:migrate:local
pnpm --filter @itafika/worker db:seed:local
pnpm --filter @itafika/worker dev
```

Remote commands:

```bash
pnpm --filter @itafika/worker db:migrate:remote
pnpm --filter @itafika/worker db:seed:remote
pnpm --filter @itafika/worker run deploy
```

## Important notes

- Local D1 and remote D1 are different databases.
- `wrangler d1 execute` runs locally unless you pass `--remote`.
- `wrangler.jsonc` must contain a real `database_id` before remote migration, remote seeding, or deploy can work.
- The current seed data is still partly illustrative. Deployment makes the API available; it does not make the data production-grade by itself.

## Related docs

- [docs/status.md](/home/manu/development/itafika/docs/status.md)
- [docs/next-phase.md](/home/manu/development/itafika/docs/next-phase.md)
- [packages/worker/wrangler.jsonc](/home/manu/development/itafika/packages/worker/wrangler.jsonc)

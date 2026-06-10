# How to Deploy the Worker

This guide is for maintainers who need to deploy the `@itafika/worker` package to Cloudflare. 

## Preparation

Before you start, make sure:
- You have a Cloudflare account.
- You have installed `wrangler` and logged in (`wrangler login`).
- You have run `pnpm install` in the project root.

To check if you are logged in to Cloudflare, run:
```bash
pnpm --filter @itafika/worker exec wrangler whoami
```

## Step 1: Create the Database

If you haven't created a D1 database yet, run this command to create the production one:

```bash
pnpm --filter @itafika/worker exec wrangler d1 create itafika
```

Wrangler will give you a `database_id` (a long string of letters and numbers). Copy it.

## Step 2: Set the Database ID

Open [packages/worker/wrangler.jsonc](/home/manu/development/itafika/packages/worker/wrangler.jsonc).

Find `database_id` and paste the ID you just copied.

## Step 3: Run Migrations

To set up the tables in your remote database, run:

```bash
pnpm --filter @itafika/worker db:migrate:remote
```

## Step 4: Add the Data (Seed)

To fill your database with our current list of zones and prices, run:

```bash
pnpm --filter @itafika/worker db:seed:remote
```

## Step 5: Deploy the API

Now you are ready to put the Worker online:

```bash
pnpm --filter @itafika/worker run deploy
```

## Step 6: Test It

Once the deploy finishes, Cloudflare will give you a URL. Test it using `curl` or your browser:

```bash
curl https://<your-worker-url>/v1/zones
```

If you see a list of zones (locations), your deployment was successful!

## Summary of Commands

| Task | Local Development | Cloudflare (Production) |
|---|---|---|
| Setup Tables | `pnpm --filter @itafika/worker db:migrate:local` | `pnpm --filter @itafika/worker db:migrate:remote` |
| Add Data | `pnpm --filter @itafika/worker db:seed:local` | `pnpm --filter @itafika/worker db:seed:remote` |
| Start Server | `pnpm --filter @itafika/worker dev` | `pnpm --filter @itafika/worker run deploy` |

## Quick Tips
- Local and remote databases are separate. Changes you make while testing locally won't show up on the live site until you run the "remote" commands.
- Make sure your `wrangler.jsonc` has the correct `database_id` or your commands will fail.

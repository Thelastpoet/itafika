import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.itafika, env.TEST_MIGRATIONS);

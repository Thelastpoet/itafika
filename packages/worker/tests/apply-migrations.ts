import { env } from "cloudflare:test";

type Migration = (typeof env.TEST_MIGRATIONS)[number];
type ColumnInfo = {
	name: string;
	notnull: number;
};

const MIGRATION_NAMES = [
	"0001_init.sql",
	"0002_deliveries.sql",
	"0003_quote_expiry.sql",
	"0004_quote_single_use.sql",
	"0005_booking_adapter_runtime.sql",
	"0006_modes.sql",
	"0007_collection.sql",
	"0008_zone_county.sql",
	"0009_booking_identity.sql",
	"0010_reliability_optional.sql",
	"0011_moderation_and_changelog.sql",
	"0012_provider_accounts.sql",
	"0013_expand_tracking_statuses.sql",
	"0014_provider_booking_tasks.sql",
	"0015_delivery_boundary_cleanup.sql",
] as const;

async function tableExists(name: string): Promise<boolean> {
	const row = await env.itafika
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
		.bind(name)
		.first<{ name: string }>();
	return row !== null;
}

async function listColumns(table: string): Promise<ColumnInfo[]> {
	const { results } = await env.itafika.prepare(`PRAGMA table_info(${table})`).all<ColumnInfo>();
	return results ?? [];
}

function getMigration(name: (typeof MIGRATION_NAMES)[number]): Migration {
	const migration = env.TEST_MIGRATIONS.find((entry) => entry.name === name);
	if (!migration) throw new Error(`Missing test migration ${name}`);
	return migration;
}

async function applyMigration(name: (typeof MIGRATION_NAMES)[number]): Promise<void> {
	const migration = getMigration(name);
	await env.itafika.batch(migration.queries.map((query) => env.itafika.prepare(query)));
}

async function clearTable(name: string): Promise<void> {
	if (!(await tableExists(name))) return;
	await env.itafika.prepare(`DELETE FROM ${name}`).run();
}

if (!(await tableExists("change_log"))) {
	for (const name of MIGRATION_NAMES.slice(0, 11)) {
		await applyMigration(name);
	}
}

if (!(await tableExists("provider_accounts"))) {
	await applyMigration("0012_provider_accounts.sql");
}

const deliveriesColumnsBeforePhaseTwo = await listColumns("deliveries");
if (!deliveriesColumnsBeforePhaseTwo.some((column) => column.name === "shop_order_ref")) {
	await applyMigration("0013_expand_tracking_statuses.sql");
}

if (!(await tableExists("provider_booking_tasks"))) {
	await applyMigration("0014_provider_booking_tasks.sql");
}

const deliveriesColumns = await listColumns("deliveries");
if (deliveriesColumns.find((column) => column.name === "sender_name")?.notnull === 1) {
	await applyMigration("0015_delivery_boundary_cleanup.sql");
}

for (const table of [
	"provider_booking_tasks",
	"tracking_events",
	"deliveries",
	"change_log",
	"submissions",
	"quotes",
	"provider_accounts",
	"rates",
	"providers",
	"zones",
	"modes",
	"freshness",
]) {
	await clearTable(table);
}

import { SELF, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
	await env.DB.batch([
		env.DB.prepare("INSERT INTO zones (id, name, type, town, lat, lng) VALUES (?,?,?,?,?,?)").bind("ZONE_NBI_CBD_01", "RNG Plaza", "cbd_hub", "Nairobi", -1.2841, 36.8255),
		env.DB.prepare("INSERT INTO zones (id, name, type, town, lat, lng) VALUES (?,?,?,?,?,?)").bind("ZONE_ELD_MAIN", "Eldoret Main Stage", "stage", "Eldoret", 0.5143, 35.2698),
		env.DB.prepare("INSERT INTO providers (id, name, type, reliability_score) VALUES (?,?,?,?)").bind("mololine", "Mololine Sacco", "matatu_sacco", 0.98),
		env.DB.prepare("INSERT INTO providers (id, name, type, reliability_score) VALUES (?,?,?,?)").bind("g4s", "G4S Courier", "national_courier", 0.99),
		env.DB.prepare("INSERT INTO rates (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source) VALUES (?,?,?,?,?,?,?,?)").bind("mololine", "ZONE_NBI_CBD_01", "ZONE_ELD_MAIN", 500, 20, "5 hours", 20, "test"),
		env.DB.prepare("INSERT INTO rates (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source) VALUES (?,?,?,?,?,?,?,?)").bind("g4s", "ZONE_NBI_CBD_01", "ZONE_ELD_MAIN", 650, 40, "next day", 50, "test"),
	]);
});

describe("GET /v1/zones", () => {
	it("lists zones, filtered by type", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/zones?type=stage");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { zones: { id: string; coordinates?: unknown }[] };
		expect(body.zones.map((z) => z.id)).toEqual(["ZONE_ELD_MAIN"]);
		expect(body.zones[0]?.coordinates).toEqual({ lat: 0.5143, lng: 35.2698 });
	});
});

describe("GET /v1/zones/search", () => {
	it("matches by name", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/zones/search?q=plaza");
		const body = (await res.json()) as { zones: { id: string }[] };
		expect(body.zones.map((z) => z.id)).toEqual(["ZONE_NBI_CBD_01"]);
	});

	it("requires q", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/zones/search");
		expect(res.status).toBe(400);
	});
});

describe("POST /v1/quotes", () => {
	const post = (body: unknown) =>
		SELF.fetch("https://api.itafika.dev/v1/quotes", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});

	it("returns the spread cheapest-first with computed cost", async () => {
		const res = await post({ origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_ELD_MAIN", package_weight_kg: 2.5 });
		expect(res.status).toBe(200);
		const body = (await res.json()) as { quotes: { provider_name: string; estimated_cost_kes: number; quote_id: string }[] };
		expect(body.quotes.map((q) => q.provider_name)).toEqual(["Mololine Sacco", "G4S Courier"]);
		expect(body.quotes[0]?.estimated_cost_kes).toBe(560);
		expect(body.quotes[0]?.quote_id).toMatch(/^qt_/);
	});

	it("rejects a non-positive weight", async () => {
		const res = await post({ origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_ELD_MAIN", package_weight_kg: 0 });
		expect(res.status).toBe(400);
	});

	it("returns an empty list for a known route with no providers", async () => {
		const res = await post({ origin_zone_id: "ZONE_ELD_MAIN", destination_zone_id: "ZONE_NBI_CBD_01", package_weight_kg: 1 });
		expect(res.status).toBe(200);
		const body = (await res.json()) as { origin_zone_id: string; quotes: unknown[] };
		expect(body.origin_zone_id).toBe("ZONE_ELD_MAIN");
		expect(body.quotes).toEqual([]);
	});

	it("returns 404 when a zone is unknown", async () => {
		const res = await post({ origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_NOWHERE", package_weight_kg: 1 });
		expect(res.status).toBe(404);
	});
});

describe("deliveries", () => {
	const json = (body: unknown, init: RequestInit = {}) =>
		SELF.fetch("https://api.itafika.dev/v1/deliveries", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
			...init,
		});

	async function bookableQuoteId(): Promise<string> {
		const res = await SELF.fetch("https://api.itafika.dev/v1/quotes", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_ELD_MAIN", package_weight_kg: 2.5 }),
		});
		const body = (await res.json()) as { quotes: { quote_id: string }[] };
		return body.quotes[0]!.quote_id;
	}

	it("books a quote and then tracks it", async () => {
		const quote_id = await bookableQuoteId();
		const created = await json({
			quote_id,
			sender: { name: "Asha Mwangi", phone: "+254712345678" },
			recipient: { name: "John Otieno", phone: "+254723456789" },
			package_description: "Sealed apparel box, 2.5kg",
		});
		expect(created.status).toBe(201);
		const delivery = (await created.json()) as { tracking_id: string; status: string; quote: { quote_id: string } };
		expect(delivery.tracking_id).toMatch(/^trk_/);
		expect(delivery.status).toBe("package_picked");
		expect(delivery.quote.quote_id).toBe(quote_id);

		const tracked = await SELF.fetch(`https://api.itafika.dev/v1/deliveries/${delivery.tracking_id}/track`);
		expect(tracked.status).toBe(200);
		const body = (await tracked.json()) as { tracking_id: string; status: string; history: { status: string }[] };
		expect(body.tracking_id).toBe(delivery.tracking_id);
		expect(body.status).toBe("package_picked");
		expect(body.history.map((e) => e.status)).toEqual(["package_picked"]);
	});

	it("returns 404 booking an unknown quote", async () => {
		const res = await json({
			quote_id: "qt_unknown",
			sender: { name: "A", phone: "+254700000000" },
			recipient: { name: "B", phone: "+254700000001" },
		});
		expect(res.status).toBe(404);
	});

	it("returns 400 when sender is missing", async () => {
		const res = await json({ quote_id: "qt_whatever", recipient: { name: "B", phone: "+254700000001" } });
		expect(res.status).toBe(400);
	});

	it("returns 404 tracking an unknown id", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/deliveries/trk_nope/track");
		expect(res.status).toBe(404);
	});
});

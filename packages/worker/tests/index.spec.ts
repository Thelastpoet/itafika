import { SELF, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
	await env.itafika.batch([
		env.itafika.prepare("INSERT OR IGNORE INTO zones (id, name, type, town, county, lat, lng) VALUES (?,?,?,?,?,?,?)").bind("ZONE_NBI_CBD_01", "RNG Plaza", "cbd_hub", "Nairobi", "Nairobi", -1.2841, 36.8255),
		env.itafika.prepare("INSERT OR IGNORE INTO zones (id, name, type, town, county, lat, lng) VALUES (?,?,?,?,?,?,?)").bind("ZONE_ELD_MAIN", "Eldoret Main Stage", "stage", "Eldoret", "Uasin Gishu", 0.5143, 35.2698),
		env.itafika.prepare("INSERT OR IGNORE INTO modes (id, label, description, source) VALUES (?,?,?,?)").bind("matatu_sacco", "Matatu SACCO", "Shared-taxi SACCO parcel desk.", "seed-illustrative"),
		env.itafika.prepare("INSERT OR IGNORE INTO modes (id, label, description, source) VALUES (?,?,?,?)").bind("national_courier", "National Courier", "Branch-network courier.", "seed-illustrative"),
		env.itafika.prepare("INSERT OR IGNORE INTO providers (id, name, type, reliability_score) VALUES (?,?,?,?)").bind("mololine", "Mololine Sacco", "matatu_sacco", 0.98),
		env.itafika.prepare("INSERT OR IGNORE INTO providers (id, name, type, reliability_score) VALUES (?,?,?,?)").bind("g4s", "G4S Courier", "national_courier", 0.99),
		env.itafika.prepare("INSERT OR IGNORE INTO rates (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source) VALUES (?,?,?,?,?,?,?,?)").bind("mololine", "ZONE_NBI_CBD_01", "ZONE_ELD_MAIN", 500, 20, "5 hours", 20, "test"),
		env.itafika.prepare("INSERT OR IGNORE INTO rates (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source) VALUES (?,?,?,?,?,?,?,?)").bind("g4s", "ZONE_NBI_CBD_01", "ZONE_ELD_MAIN", 650, 40, "next day", 50, "test"),
		env.itafika.prepare("INSERT OR IGNORE INTO freshness (town, last_updated) VALUES (?,?)").bind("Eldoret", "2026-06-08"),
		env.itafika.prepare("INSERT OR IGNORE INTO freshness (town, last_updated) VALUES (?,?)").bind("Nairobi", "2026-06-08"),
	]);
});

describe("GET /v1/zones", () => {
	it("lists zones, filtered by type", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/zones?type=stage");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { zones: { id: string; coordinates?: unknown }[] };
		expect(body.zones.map((z) => z.id)).toContain("ZONE_ELD_MAIN");
		expect(body.zones.find((z) => z.id === "ZONE_ELD_MAIN")?.coordinates).toEqual({ lat: 0.5143, lng: 35.2698 });
	});

	it("supports HEAD with the same status and no response body", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/zones?type=stage", { method: "HEAD" });
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("application/json");
		expect(await res.text()).toBe("");
	});

	it("supports OPTIONS with an accurate Allow header", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/zones", { method: "OPTIONS" });
		expect(res.status).toBe(204);
		expect(res.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
		expect(await res.text()).toBe("");
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

describe("GET /v1/freshness", () => {
	it("lists dataset freshness by town", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/freshness");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { freshness: { town: string; last_updated: string }[] };
		expect(body.freshness).toEqual(
			expect.arrayContaining([
				{ town: "Eldoret", last_updated: "2026-06-08" },
				{ town: "Nairobi", last_updated: "2026-06-08" },
			]),
		);
	});
});

describe("GET /v1/zones filters", () => {
	it("filters by town", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/zones?town=Eldoret");
		const body = (await res.json()) as { zones: { id: string }[] };
		expect(body.zones.map((z) => z.id)).toEqual(["ZONE_ELD_MAIN"]);
	});

	it("filters by county", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/zones?county=Uasin%20Gishu");
		const body = (await res.json()) as { zones: { id: string; county?: string }[] };
		expect(body.zones.map((z) => z.id)).toEqual(["ZONE_ELD_MAIN"]);
		expect(body.zones[0]?.county).toBe("Uasin Gishu");
	});
});

describe("GET /v1/modes", () => {
	it("lists the transport-mode registry", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/modes");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { modes: { id: string; label: string }[] };
		expect(body.modes.map((m) => m.id)).toEqual(expect.arrayContaining(["matatu_sacco", "national_courier"]));
		expect(body.modes.find((m) => m.id === "matatu_sacco")?.label).toBe("Matatu SACCO");
	});
});

describe("GET /v1/options", () => {
	it("lists providers serving a town, with collection points and from-cost", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/options?origin_zone_id=ZONE_NBI_CBD_01&destination_town=Eldoret");
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			origin_zone_id: string;
			destination_town: string;
			options: { provider_name: string; provider_type: string; from_cost_kes: number; collection_points: { zone_id: string; name: string }[] }[];
		};
		expect(body.destination_town).toBe("Eldoret");
		// both providers serve NBI -> Eldoret; cheapest (mololine, 500) ranks first
		expect(body.options.map((o) => o.provider_name)).toEqual(["Mololine Sacco", "G4S Courier"]);
		expect(body.options[0]?.from_cost_kes).toBe(500);
		expect(body.options[0]?.collection_points).toEqual([{ zone_id: "ZONE_ELD_MAIN", name: "Eldoret Main Stage", town: "Eldoret" }]);
	});

	it("filters by mode", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/options?origin_zone_id=ZONE_NBI_CBD_01&destination_town=Eldoret&mode=national_courier");
		const body = (await res.json()) as { options: { provider_name: string }[] };
		expect(body.options.map((o) => o.provider_name)).toEqual(["G4S Courier"]);
	});

	it("returns an empty list for an unknown town", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/options?origin_zone_id=ZONE_NBI_CBD_01&destination_town=Atlantis");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { options: unknown[] };
		expect(body.options).toEqual([]);
	});

	it("requires origin_zone_id and destination_town", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/options?origin_zone_id=ZONE_NBI_CBD_01");
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
		expect(body.quotes[0]?.quote_id).toMatch(/^qt_[a-f0-9]{24}$/);
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

	it("returns 405 for GET on the quotes endpoint", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/quotes");
		expect(res.status).toBe(405);
		expect(res.headers.get("allow")).toBe("POST, OPTIONS");
		const body = (await res.json()) as { error: { code: string } };
		expect(body.error.code).toBe("method_not_allowed");
	});

	it("returns 405 for HEAD on the quotes endpoint", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/quotes", { method: "HEAD" });
		expect(res.status).toBe(405);
		expect(res.headers.get("allow")).toBe("POST, OPTIONS");
		expect(await res.text()).toBe("");
	});

	it("supports OPTIONS with an accurate Allow header", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/quotes", { method: "OPTIONS" });
		expect(res.status).toBe(204);
		expect(res.headers.get("allow")).toBe("POST, OPTIONS");
		expect(await res.text()).toBe("");
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

	const baseDeliveryBody = (quote_id: string, extra: Record<string, unknown> = {}) => ({
		quote_id,
		shop_order_ref: "ORDER-12345",
		shop_handoff_url: "https://shop.example.com/delivery-handoff/ORDER-12345",
		sender: { name: "Asha Mwangi", phone: "+254712345678" },
		recipient: { name: "John Otieno", phone: "+254723456789" },
		...extra,
	});

	it("books a quote and then tracks it", async () => {
		const quote_id = await bookableQuoteId();
		const created = await json(baseDeliveryBody(quote_id, { package_description: "Sealed apparel box, 2.5kg" }));
		expect(created.status).toBe(201);
		const delivery = (await created.json()) as {
			tracking_id: string;
			status: string;
			quote: { quote_id: string };
			shop_order_ref: string;
			shop_handoff_url?: string;
		};
		expect(delivery.tracking_id).toMatch(/^trk_[a-f0-9]{32}$/);
		expect(delivery.status).toBe("booking_requested");
		expect(delivery.shop_order_ref).toBe("ORDER-12345");
		expect(delivery.quote.quote_id).toBe(quote_id);

		const tracked = await SELF.fetch(`https://api.itafika.dev/v1/deliveries/${delivery.tracking_id}/track`);
		expect(tracked.status).toBe(200);
		const body = (await tracked.json()) as { tracking_id: string; status: string; history: { status: string }[] };
		expect(body.tracking_id).toBe(delivery.tracking_id);
		expect(body.status).toBe("package_picked");
		expect(body.history.map((e) => e.status)).toEqual(["booking_requested", "booking_confirmed", "package_picked"]);
	});

	it("captures and echoes handover instructions and collection identity", async () => {
		const quote_id = await bookableQuoteId();
		const created = await json(
			baseDeliveryBody(quote_id, {
				recipient: { name: "John Otieno", phone: "+254723456789", id_number: "12345678" },
				instructions: "Call before handover; give to Achieng (sister).",
				alternate_collector: { name: "Achieng Otieno", phone: "+254700111222", id_number: "87654321" },
			}),
		);
		expect(created.status).toBe(201);
		const delivery = (await created.json()) as { tracking_id: string };

		// legacy handover fields are persisted as compatibility data, but the public
		// delivery response stays shop-reference based.
		const row = await env.itafika
			.prepare("SELECT instructions, recipient_id_number, alternate_collector_name, alternate_collector_id_number FROM deliveries WHERE tracking_id = ?")
			.bind(delivery.tracking_id)
			.first<{ instructions: string; recipient_id_number: string; alternate_collector_name: string; alternate_collector_id_number: string }>();
		expect(row?.instructions).toBe("Call before handover; give to Achieng (sister).");
		expect(row?.recipient_id_number).toBe("12345678");
		expect(row?.alternate_collector_name).toBe("Achieng Otieno");
		expect(row?.alternate_collector_id_number).toBe("87654321");
	});

	it("rejects a malformed alternate_collector", async () => {
		const quote_id = await bookableQuoteId();
		const res = await json({
			...baseDeliveryBody(quote_id),
			alternate_collector: { name: "No Phone" },
		});
		expect(res.status).toBe(400);
	});

	it("books through the provider adapter and records its ref and event source", async () => {
		const quote_id = await bookableQuoteId();
		const created = await json(baseDeliveryBody(quote_id));
		expect(created.status).toBe(201);
		const { tracking_id } = (await created.json()) as { tracking_id: string };

		// provider_ref / provider_id are internal (not in the API response), so assert via D1.
		const row = await env.itafika
			.prepare(
				"SELECT d.provider_ref AS provider_ref, q.provider_id AS provider_id FROM deliveries d JOIN quotes q ON q.quote_id = d.quote_id WHERE d.tracking_id = ?",
			)
			.bind(tracking_id)
			.first<{ provider_ref: string; provider_id: string }>();
		// cheapest provider for this route is mololine; the adapter mints a ref prefixed with its id
		expect(row?.provider_id).toBe("mololine");
		expect(row?.provider_ref).toMatch(/^mololine_[a-f0-9]{32}$/);

		const event = await env.itafika
			.prepare("SELECT source FROM tracking_events WHERE tracking_id = ? ORDER BY id LIMIT 1")
			.bind(tracking_id)
			.first<{ source: string }>();
		expect(event?.source).toBe("booking");
	});

	it("uses the latest tracking event as the current status", async () => {
		const quote_id = await bookableQuoteId();
		const created = await json(baseDeliveryBody(quote_id));
		const delivery = (await created.json()) as { tracking_id: string };

		await env.itafika
			.prepare("UPDATE deliveries SET status = ? WHERE tracking_id = ?")
			.bind("package_picked", delivery.tracking_id)
			.run();
		await env.itafika
			.prepare("INSERT INTO tracking_events (tracking_id, status, at) VALUES (?,?,?)")
			.bind(delivery.tracking_id, "in_transit", "2026-06-08T09:00:00.000Z")
			.run();

		const tracked = await SELF.fetch(`https://api.itafika.dev/v1/deliveries/${delivery.tracking_id}/track`);
		expect(tracked.status).toBe(200);
		const body = (await tracked.json()) as { status: string; history: { status: string }[] };
		expect(body.status).toBe("in_transit");
		expect(body.history.map((event) => event.status)).toEqual([
			"booking_requested",
			"booking_confirmed",
			"package_picked",
			"in_transit",
		]);
	});

	it("appends a manual tracking event and returns updated history", async () => {
		const quote_id = await bookableQuoteId();
		const created = await json(baseDeliveryBody(quote_id));
		const delivery = (await created.json()) as { tracking_id: string };

		const updated = await SELF.fetch(`https://api.itafika.dev/v1/deliveries/${delivery.tracking_id}/events`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ status: "in_transit", note: "Loaded onto upcountry parcel van" }),
		});
		expect(updated.status).toBe(201);
		const body = (await updated.json()) as { status: string; history: { status: string; note?: string }[] };
		expect(body.status).toBe("in_transit");
		expect(body.history.map((event) => event.status)).toEqual([
			"booking_requested",
			"booking_confirmed",
			"package_picked",
			"in_transit",
		]);
		expect(body.history[3]?.note).toBe("Loaded onto upcountry parcel van");
	});

	it("rejects backward manual status transitions", async () => {
		const quote_id = await bookableQuoteId();
		const created = await json(baseDeliveryBody(quote_id));
		const delivery = (await created.json()) as { tracking_id: string };

		await SELF.fetch(`https://api.itafika.dev/v1/deliveries/${delivery.tracking_id}/events`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ status: "in_transit" }),
		});

		const regressed = await SELF.fetch(`https://api.itafika.dev/v1/deliveries/${delivery.tracking_id}/events`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ status: "package_picked" }),
		});
		expect(regressed.status).toBe(409);
	});

	it("returns 404 when appending an event to an unknown tracking id", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/deliveries/trk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/events", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ status: "in_transit" }),
		});
		expect(res.status).toBe(404);
	});

	it("does not allow the same quote to be booked twice", async () => {
		const quote_id = await bookableQuoteId();
		const payload = baseDeliveryBody(quote_id);

		const first = await json(payload);
		expect(first.status).toBe(201);

		const second = await json(payload);
		expect(second.status).toBe(404);
	});

	it("returns 404 booking an unknown quote", async () => {
		const res = await json({
			quote_id: "qt_aaaaaaaaaaaaaaaaaaaaaaaa",
			shop_order_ref: "ORDER-404",
			sender: { name: "A", phone: "+254700000000" },
			recipient: { name: "B", phone: "+254700000001" },
		});
		expect(res.status).toBe(404);
	});

	it("returns 404 booking an expired quote", async () => {
		await env.itafika
			.prepare(
				"INSERT INTO quotes (quote_id, provider_type, provider_name, estimated_cost_kes, estimated_time, reliability_score, origin_zone_id, destination_zone_id, package_weight_kg, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
			)
			.bind(
				"qt_bbbbbbbbbbbbbbbbbbbbbbbb",
				"matatu_sacco",
				"Mololine Sacco",
				500,
				"5 hours",
				0.98,
				"ZONE_NBI_CBD_01",
				"ZONE_ELD_MAIN",
				2.5,
				"2026-06-01T08:00:00.000Z",
				"2026-06-01T09:00:00.000Z",
			)
			.run();

		const res = await json({
			quote_id: "qt_bbbbbbbbbbbbbbbbbbbbbbbb",
			shop_order_ref: "ORDER-EXPIRED",
			sender: { name: "A", phone: "+254700000000" },
			recipient: { name: "B", phone: "+254700000001" },
		});
		expect(res.status).toBe(404);
	});

	it("returns 400 when shop_order_ref is missing", async () => {
		const res = await json({ quote_id: "qt_aaaaaaaaaaaaaaaaaaaaaaaa", recipient: { name: "B", phone: "+254700000001" } });
		expect(res.status).toBe(400);
	});

	it("returns 400 for invalid contact details", async () => {
		const quote_id = await bookableQuoteId();
		const res = await json({
			quote_id,
			shop_order_ref: "ORDER-INVALID",
			sender: { name: "   ", phone: "0712345678" },
			recipient: { name: "B", phone: "+254700000001" },
		});
		expect(res.status).toBe(400);
	});

	it("returns 400 for oversized package descriptions", async () => {
		const quote_id = await bookableQuoteId();
		const res = await json({
			quote_id,
			shop_order_ref: "ORDER-LONG",
			sender: { name: "Asha Mwangi", phone: "+254712345678" },
			recipient: { name: "John Otieno", phone: "+254723456789" },
			package_description: "x".repeat(501),
		});
		expect(res.status).toBe(400);
	});

	it("returns 404 tracking an unknown id", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/deliveries/trk_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/track");
		expect(res.status).toBe(404);
	});

	it("returns 400 for malformed tracking ids", async () => {
		const res = await SELF.fetch("https://api.itafika.dev/v1/deliveries/trk_nope/track");
		expect(res.status).toBe(400);
	});
});

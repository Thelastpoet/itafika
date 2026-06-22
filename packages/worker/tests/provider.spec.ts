import { SELF, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import { providerTokenHash } from "../src/provider-auth.js";

const MOL0LINE_TOKEN = "provider-mololine-token";
const G4S_TOKEN = "provider-g4s-token";
const DISABLED_TOKEN = "provider-disabled-token";

function authHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}

async function bookableQuoteId(): Promise<string> {
  const res = await SELF.fetch("https://api.itafika.dev/v1/quotes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_ELD_MAIN", package_weight_kg: 2.5 }),
  });
  const body = (await res.json()) as { quotes: { quote_id: string }[] };
  return body.quotes[0]!.quote_id;
}

beforeAll(async () => {
  const [mololineHash, g4sHash, disabledHash] = await Promise.all([
    providerTokenHash(MOL0LINE_TOKEN),
    providerTokenHash(G4S_TOKEN),
    providerTokenHash(DISABLED_TOKEN),
  ]);

  await env.itafika.batch([
    env.itafika.prepare("INSERT OR IGNORE INTO zones (id, name, type, town, county, lat, lng) VALUES (?,?,?,?,?,?,?)").bind("ZONE_NBI_CBD_01", "RNG Plaza", "cbd_hub", "Nairobi", "Nairobi", -1.2841, 36.8255),
    env.itafika.prepare("INSERT OR IGNORE INTO zones (id, name, type, town, county, lat, lng) VALUES (?,?,?,?,?,?,?)").bind("ZONE_ELD_MAIN", "Eldoret Main Stage", "stage", "Eldoret", "Uasin Gishu", 0.5143, 35.2698),
    env.itafika.prepare("INSERT OR IGNORE INTO modes (id, label, description, source) VALUES (?,?,?,?)").bind("matatu_sacco", "Matatu SACCO", "Shared-taxi SACCO parcel desk.", "seed-illustrative"),
    env.itafika.prepare("INSERT OR IGNORE INTO modes (id, label, description, source) VALUES (?,?,?,?)").bind("national_courier", "National Courier", "Branch-network courier.", "seed-illustrative"),
    env.itafika.prepare("INSERT OR IGNORE INTO providers (id, name, type, reliability_score) VALUES (?,?,?,?)").bind("mololine", "Mololine Sacco", "matatu_sacco", 0.98),
    env.itafika.prepare("INSERT OR IGNORE INTO providers (id, name, type, reliability_score) VALUES (?,?,?,?)").bind("g4s", "G4S Courier", "national_courier", 0.99),
    env.itafika.prepare("INSERT OR IGNORE INTO rates (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source) VALUES (?,?,?,?,?,?,?,?)").bind("mololine", "ZONE_NBI_CBD_01", "ZONE_ELD_MAIN", 500, 20, "5 hours", 20, "test"),
    env.itafika.prepare("INSERT OR IGNORE INTO rates (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source) VALUES (?,?,?,?,?,?,?,?)").bind("g4s", "ZONE_NBI_CBD_01", "ZONE_ELD_MAIN", 650, 40, "next day", 50, "test"),
    env.itafika.prepare("INSERT OR IGNORE INTO provider_accounts (id, provider_id, display_name, token_hash, status, created_at) VALUES (?,?,?,?,?,?)").bind("pa_0123456789abcdef01234567", "mololine", "Mololine Nakuru desk", mololineHash, "active", "2026-06-22T00:00:00.000Z"),
    env.itafika.prepare("INSERT OR IGNORE INTO provider_accounts (id, provider_id, display_name, token_hash, status, created_at) VALUES (?,?,?,?,?,?)").bind("pa_89abcdef0123456701234567", "g4s", "G4S Eldoret desk", g4sHash, "active", "2026-06-22T00:00:00.000Z"),
    env.itafika.prepare("INSERT OR IGNORE INTO provider_accounts (id, provider_id, display_name, token_hash, status, created_at, disabled_at) VALUES (?,?,?,?,?,?,?)").bind("pa_ffffffffffffffffffffffff", "mololine", "Disabled Mololine desk", disabledHash, "disabled", "2026-06-22T00:00:00.000Z", "2026-06-22T00:00:00.000Z"),
  ]);
});

describe("provider auth", () => {
  it("returns the authenticated provider account", async () => {
    const res = await SELF.fetch("https://api.itafika.dev/v1/provider/me", {
      headers: authHeaders(MOL0LINE_TOKEN),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      account: { id: string; provider_id: string; display_name: string; status: string };
    };
    expect(body.account.provider_id).toBe("mololine");
    expect(body.account.display_name).toBe("Mololine Nakuru desk");
    expect(body.account.status).toBe("active");
  });

  it("rejects disabled provider accounts", async () => {
    const res = await SELF.fetch("https://api.itafika.dev/v1/provider/me", {
      headers: authHeaders(DISABLED_TOKEN),
    });
    expect(res.status).toBe(401);
  });

  it("rejects provider tokens on moderator actions", async () => {
    const res = await SELF.fetch("https://api.itafika.dev/v1/submissions/sub_missing/approve", {
      method: "POST",
      headers: authHeaders(MOL0LINE_TOKEN),
      body: JSON.stringify({ note: "nope" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("provider submissions", () => {
  it("creates a pending own-rate submission", async () => {
    const res = await SELF.fetch("https://api.itafika.dev/v1/provider/submissions", {
      method: "POST",
      headers: authHeaders(MOL0LINE_TOKEN),
      body: JSON.stringify({
        target: "rates",
        operation: "create",
        payload: {
          provider_id: "mololine",
          origin_zone_id: "ZONE_NBI_CBD_01",
          destination_zone_id: "ZONE_ELD_MAIN",
          base_cost_kes: 550,
          cost_per_kg_kes: 20,
          est_time: "5 hours",
          max_weight_kg: 20,
          collection_type: "office_pickup",
          source: "Mololine desk call",
        },
        source: "Mololine desk call",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { submitted_by: string; status: string };
    expect(body.submitted_by).toBe("Mololine Nakuru desk");
    expect(body.status).toBe("pending");
  });

  it("rejects another provider's data", async () => {
    const res = await SELF.fetch("https://api.itafika.dev/v1/provider/submissions", {
      method: "POST",
      headers: authHeaders(MOL0LINE_TOKEN),
      body: JSON.stringify({
        target: "rates",
        operation: "create",
        payload: {
          provider_id: "g4s",
          origin_zone_id: "ZONE_NBI_CBD_01",
          destination_zone_id: "ZONE_ELD_MAIN",
          base_cost_kes: 550,
          cost_per_kg_kes: 20,
          est_time: "5 hours",
          max_weight_kg: 20,
          collection_type: "office_pickup",
          source: "Mololine desk call",
        },
        source: "Mololine desk call",
      }),
    });
    expect(res.status).toBe(403);
  });
});

describe("provider booking tasks", () => {
  it("creates a pending task for an invited provider and supports accept and tracking updates", async () => {
    const quoteId = await bookableQuoteId();
    const created = await SELF.fetch("https://api.itafika.dev/v1/deliveries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quote_id: quoteId,
        shop_order_ref: "ORDER-PROVIDER-1",
        shop_handoff_url: "https://shop.example.com/delivery-handoff/ORDER-PROVIDER-1",
      }),
    });
    expect(created.status).toBe(201);
    const delivery = (await created.json()) as { tracking_id: string; status: string; shop_order_ref: string };
    expect(delivery.status).toBe("booking_requested");
    expect(delivery.shop_order_ref).toBe("ORDER-PROVIDER-1");

    const taskRow = await env.itafika
      .prepare("SELECT id, delivery_tracking_id, status FROM provider_booking_tasks WHERE delivery_tracking_id = ?")
      .bind(delivery.tracking_id)
      .first<{ id: string; delivery_tracking_id: string; status: string }>();
    expect(taskRow?.status).toBe("pending");

    const list = await SELF.fetch("https://api.itafika.dev/v1/provider/bookings", {
      headers: authHeaders(MOL0LINE_TOKEN),
    });
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { bookings: { id: string; tracking_id: string; status: string }[] };
    expect(listBody.bookings.map((booking) => booking.id)).toContain(taskRow!.id);

    const detail = await SELF.fetch(`https://api.itafika.dev/v1/provider/bookings/${taskRow!.id}`, {
      headers: authHeaders(MOL0LINE_TOKEN),
    });
    expect(detail.status).toBe(200);
    const detailBody = (await detail.json()) as {
      booking: { status: string };
      delivery: { shop_order_ref: string | null; status: string };
      quote: { provider_name: string };
    };
    expect(detailBody.booking.status).toBe("pending");
    expect(detailBody.delivery.shop_order_ref).toBe("ORDER-PROVIDER-1");
    expect(detailBody.quote.provider_name).toBe("Mololine Sacco");

    const accept = await SELF.fetch(`https://api.itafika.dev/v1/provider/bookings/${taskRow!.id}/accept`, {
      method: "POST",
      headers: authHeaders(MOL0LINE_TOKEN),
      body: "{}",
    });
    expect(accept.status).toBe(200);
    const acceptBody = (await accept.json()) as { booking: { status: string }; delivery: { status: string } };
    expect(acceptBody.booking.status).toBe("accepted");
    expect(acceptBody.delivery.status).toBe("booking_confirmed");

    const event = await SELF.fetch(`https://api.itafika.dev/v1/provider/bookings/${taskRow!.id}/events`, {
      method: "POST",
      headers: authHeaders(MOL0LINE_TOKEN),
      body: JSON.stringify({ status: "in_transit", note: "Loaded onto the linehaul vehicle" }),
    });
    expect(event.status).toBe(200);
    const eventBody = (await event.json()) as { delivery: { status: string } };
    expect(eventBody.delivery.status).toBe("in_transit");

    const tracked = await SELF.fetch(`https://api.itafika.dev/v1/deliveries/${delivery.tracking_id}/track`);
    expect(tracked.status).toBe(200);
    const trackedBody = (await tracked.json()) as { status: string; history: { status: string }[] };
    expect(trackedBody.status).toBe("in_transit");
    expect(trackedBody.history.map((event) => event.status)).toEqual(["booking_requested", "booking_confirmed", "in_transit"]);
  });

  it("rejects out-of-scope booking access", async () => {
    const quoteId = await bookableQuoteId();
    const created = await SELF.fetch("https://api.itafika.dev/v1/deliveries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quote_id: quoteId,
        shop_order_ref: "ORDER-PROVIDER-2",
      }),
    });
    const delivery = (await created.json()) as { tracking_id: string };
    const taskRow = await env.itafika
      .prepare("SELECT id FROM provider_booking_tasks WHERE delivery_tracking_id = ?")
      .bind(delivery.tracking_id)
      .first<{ id: string }>();

    const otherProvider = await SELF.fetch(`https://api.itafika.dev/v1/provider/bookings/${taskRow!.id}`, {
      headers: authHeaders(G4S_TOKEN),
    });
    expect(otherProvider.status).toBe(404);
  });

  it("rejects bookings without a note", async () => {
    const quoteId = await bookableQuoteId();
    const created = await SELF.fetch("https://api.itafika.dev/v1/deliveries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quote_id: quoteId,
        shop_order_ref: "ORDER-PROVIDER-3",
      }),
    });
    const delivery = (await created.json()) as { tracking_id: string };
    const taskRow = await env.itafika
      .prepare("SELECT id FROM provider_booking_tasks WHERE delivery_tracking_id = ?")
      .bind(delivery.tracking_id)
      .first<{ id: string }>();

    const rejected = await SELF.fetch(`https://api.itafika.dev/v1/provider/bookings/${taskRow!.id}/reject`, {
      method: "POST",
      headers: authHeaders(MOL0LINE_TOKEN),
      body: JSON.stringify({}),
    });
    expect(rejected.status).toBe(400);
  });

  it("cancels a delivery when a provider rejects a booking", async () => {
    const quoteId = await bookableQuoteId();
    const created = await SELF.fetch("https://api.itafika.dev/v1/deliveries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quote_id: quoteId,
        shop_order_ref: "ORDER-PROVIDER-4",
      }),
    });
    const delivery = (await created.json()) as { tracking_id: string };
    const taskRow = await env.itafika
      .prepare("SELECT id FROM provider_booking_tasks WHERE delivery_tracking_id = ?")
      .bind(delivery.tracking_id)
      .first<{ id: string }>();

    const rejected = await SELF.fetch(`https://api.itafika.dev/v1/provider/bookings/${taskRow!.id}/reject`, {
      method: "POST",
      headers: authHeaders(MOL0LINE_TOKEN),
      body: JSON.stringify({ note: "No driver available" }),
    });
    expect(rejected.status).toBe(200);
    const rejectedBody = (await rejected.json()) as { booking: { status: string }; delivery: { status: string } };
    expect(rejectedBody.booking.status).toBe("rejected");
    expect(rejectedBody.delivery.status).toBe("delivery_cancelled");

    const tracked = await SELF.fetch(`https://api.itafika.dev/v1/deliveries/${delivery.tracking_id}/track`);
    const trackedBody = (await tracked.json()) as { status: string; history: { status: string }[] };
    expect(trackedBody.status).toBe("delivery_cancelled");
    expect(trackedBody.history.map((event) => event.status)).toEqual(["booking_requested", "delivery_cancelled"]);
  });
});

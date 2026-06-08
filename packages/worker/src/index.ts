import { quote } from "@itafika/core";
import type { Contact, DeliveryRequest, Quote, QuoteOption, QuoteRequest, ZoneType } from "@itafika/core";
import {
  createDelivery,
  listZones,
  loadQuoteData,
  persistQuotes,
  searchZones,
  trackDelivery,
  zonesExist,
} from "./db.js";

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const fail = (code: string, message: string, status: number): Response =>
  json({ error: { code, message } }, status);

function clampLimit(raw: string | null): number {
  const n = raw === null ? 100 : Number(raw);
  if (!Number.isFinite(n)) return 100;
  return Math.min(500, Math.max(1, Math.trunc(n)));
}

const shortId = (prefix: string): string => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

function withQuoteId(option: QuoteOption): Quote {
  return { quote_id: shortId("qt"), ...option };
}

function isContact(c: unknown): c is Contact {
  return typeof c === "object" && c !== null && typeof (c as Contact).name === "string" && typeof (c as Contact).phone === "string";
}

async function handleQuotes(request: Request, env: Env): Promise<Response> {
  let body: Partial<QuoteRequest>;
  try {
    body = (await request.json()) as Partial<QuoteRequest>;
  } catch {
    return fail("invalid_request", "Request body must be valid JSON", 400);
  }

  const { origin_zone_id, destination_zone_id, package_weight_kg } = body;
  if (typeof origin_zone_id !== "string" || typeof destination_zone_id !== "string") {
    return fail("invalid_request", "origin_zone_id and destination_zone_id are required", 400);
  }
  if (typeof package_weight_kg !== "number" || !(package_weight_kg > 0)) {
    return fail("invalid_request", "package_weight_kg must be a positive number", 400);
  }

  if (!(await zonesExist(env.DB, origin_zone_id, destination_zone_id))) {
    return fail("not_found", "One or both zone IDs are unknown", 404);
  }

  const data = await loadQuoteData(env.DB, origin_zone_id, destination_zone_id);
  const quotes = quote({ origin_zone_id, destination_zone_id, package_weight_kg }, data).map(withQuoteId);
  await persistQuotes(env.DB, quotes, origin_zone_id, destination_zone_id, package_weight_kg, new Date().toISOString());
  return json({ origin_zone_id, destination_zone_id, quotes });
}

async function handleCreateDelivery(request: Request, env: Env): Promise<Response> {
  let body: Partial<DeliveryRequest>;
  try {
    body = (await request.json()) as Partial<DeliveryRequest>;
  } catch {
    return fail("invalid_request", "Request body must be valid JSON", 400);
  }

  if (typeof body.quote_id !== "string") return fail("invalid_request", "quote_id is required", 400);
  if (!isContact(body.sender)) return fail("invalid_request", "sender.name and sender.phone are required", 400);
  if (!isContact(body.recipient)) return fail("invalid_request", "recipient.name and recipient.phone are required", 400);

  const req: DeliveryRequest = { quote_id: body.quote_id, sender: body.sender, recipient: body.recipient };
  if (typeof body.package_description === "string") req.package_description = body.package_description;

  const delivery = await createDelivery(env.DB, req);
  if (!delivery) return fail("not_found", "The quote_id is unknown or has expired", 404);
  return json(delivery, 201);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const { method } = request;

    try {
      if (method === "GET" && pathname === "/v1/zones") {
        const type = url.searchParams.get("type") as ZoneType | null;
        const zones = await listZones(env.DB, type ?? undefined, clampLimit(url.searchParams.get("limit")));
        return json({ zones });
      }

      if (method === "GET" && pathname === "/v1/zones/search") {
        const q = url.searchParams.get("q");
        if (!q) return fail("invalid_request", "query parameter q is required", 400);
        const zones = await searchZones(env.DB, q, clampLimit(url.searchParams.get("limit")));
        return json({ zones });
      }

      if (method === "POST" && pathname === "/v1/quotes") {
        return await handleQuotes(request, env);
      }

      if (method === "POST" && pathname === "/v1/deliveries") {
        return await handleCreateDelivery(request, env);
      }

      const track = pathname.match(/^\/v1\/deliveries\/([^/]+)\/track$/);
      if (method === "GET" && track) {
        const result = await trackDelivery(env.DB, decodeURIComponent(track[1]!));
        if (!result) return fail("not_found", "Unknown tracking ID", 404);
        return json(result);
      }

      return fail("not_found", `No route for ${method} ${pathname}`, 404);
    } catch {
      return fail("internal_error", "Unexpected error", 500);
    }
  },
} satisfies ExportedHandler<Env>;

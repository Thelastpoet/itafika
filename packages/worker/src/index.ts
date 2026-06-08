import type { DeliveryRequest, QuoteRequest, ZoneType } from "@itafika/core";
import {
  listFreshness,
  listZones,
  searchZones,
  trackDelivery,
} from "./db.js";
import { bookDelivery } from "./delivery-service.js";
import { clampLimit, isQuoteId, isTrackingId, parseContact, parsePackageDescription } from "./validation.js";
import { createQuotes } from "./quote-service.js";

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const fail = (code: string, message: string, status: number): Response =>
  json({ error: { code, message } }, status);

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

  const result = await createQuotes(env.DB, { origin_zone_id, destination_zone_id, package_weight_kg });
  if (!result.ok) return fail("not_found", "One or both zone IDs are unknown", 404);
  return json(result.body);
}

async function handleCreateDelivery(request: Request, env: Env): Promise<Response> {
  let body: Partial<DeliveryRequest>;
  try {
    body = (await request.json()) as Partial<DeliveryRequest>;
  } catch {
    return fail("invalid_request", "Request body must be valid JSON", 400);
  }

  if (typeof body.quote_id !== "string" || !isQuoteId(body.quote_id)) {
    return fail("invalid_request", "quote_id must be a valid quote identifier", 400);
  }

  const sender = parseContact(body.sender);
  if (sender === null) {
    return fail("invalid_request", "sender.name and sender.phone must be valid", 400);
  }

  const recipient = parseContact(body.recipient);
  if (recipient === null) {
    return fail("invalid_request", "recipient.name and recipient.phone must be valid", 400);
  }

  const req: DeliveryRequest = { quote_id: body.quote_id, sender, recipient };
  if (body.package_description !== undefined) {
    const packageDescription = parsePackageDescription(body.package_description);
    if (packageDescription === null) {
      return fail("invalid_request", "package_description must be a non-empty string up to 500 characters", 400);
    }
    req.package_description = packageDescription;
  }

  const delivery = await bookDelivery(env.DB, req);
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

      if (method === "GET" && pathname === "/v1/freshness") {
        const freshness = await listFreshness(env.DB);
        return json({ freshness });
      }

      if (method === "POST" && pathname === "/v1/quotes") {
        return await handleQuotes(request, env);
      }

      if (method === "POST" && pathname === "/v1/deliveries") {
        return await handleCreateDelivery(request, env);
      }

      const track = pathname.match(/^\/v1\/deliveries\/([^/]+)\/track$/);
      if (method === "GET" && track) {
        const trackingId = decodeURIComponent(track[1]!);
        if (!isTrackingId(trackingId)) {
          return fail("invalid_request", "tracking_id must be a valid tracking identifier", 400);
        }
        const result = await trackDelivery(env.DB, trackingId);
        if (!result) return fail("not_found", "Unknown tracking ID", 404);
        return json(result);
      }

      return fail("not_found", `No route for ${method} ${pathname}`, 404);
    } catch {
      return fail("internal_error", "Unexpected error", 500);
    }
  },
} satisfies ExportedHandler<Env>;

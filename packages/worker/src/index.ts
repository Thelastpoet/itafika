import { quote } from "@itafika/core";
import type { Contact, DeliveryRequest, Quote, QuoteOption, QuoteRequest, ZoneType } from "@itafika/core";
import {
  createDelivery,
  listFreshness,
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

const QUOTE_ID_RE = /^qt_[a-f0-9]{24}$/;
const TRACKING_ID_RE = /^trk_[a-f0-9]{32}$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const NAME_MAX_LENGTH = 120;
const PHONE_MAX_LENGTH = 16;
const PACKAGE_DESCRIPTION_MAX_LENGTH = 500;
const QUOTE_TTL_HOURS = 24;

function clampLimit(raw: string | null): number {
  const n = raw === null ? 100 : Number(raw);
  if (!Number.isFinite(n)) return 100;
  return Math.min(500, Math.max(1, Math.trunc(n)));
}

const opaqueId = (prefix: string, hexLength: number): string =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, hexLength)}`;

function withQuoteId(option: QuoteOption): Quote {
  return { quote_id: opaqueId("qt", 24), ...option };
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maxLength) return null;
  return normalized;
}

function parseContact(value: unknown): Contact | null {
  if (typeof value !== "object" || value === null) return null;
  const name = normalizeText((value as Contact).name, NAME_MAX_LENGTH);
  const phone = normalizeText((value as Contact).phone, PHONE_MAX_LENGTH);
  if (name === null || phone === null || !PHONE_RE.test(phone)) return null;
  return { name, phone };
}

function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 60 * 60 * 1000).toISOString();
}

async function handleQuotes(request: Request, env: Env): Promise<Response> {
  let body: Partial<QuoteRequest>;
  try {
    body = (await request.json()) as Partial<QuoteRequest>;
  } catch {
    return fail("invalid_request", "Request body must be valid JSON", 400);
  }

  const { origin_zone_id, destination_zone_id, package_weight_kg, package_type } = body;
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
  const quotes = quote({ origin_zone_id, destination_zone_id, package_weight_kg, package_type }, data).map(withQuoteId);
  const createdAt = new Date().toISOString();
  await persistQuotes(
    env.DB,
    quotes,
    origin_zone_id,
    destination_zone_id,
    package_weight_kg,
    createdAt,
    addHours(createdAt, QUOTE_TTL_HOURS),
  );
  return json({ origin_zone_id, destination_zone_id, quotes });
}

async function handleCreateDelivery(request: Request, env: Env): Promise<Response> {
  let body: Partial<DeliveryRequest>;
  try {
    body = (await request.json()) as Partial<DeliveryRequest>;
  } catch {
    return fail("invalid_request", "Request body must be valid JSON", 400);
  }

  if (typeof body.quote_id !== "string" || !QUOTE_ID_RE.test(body.quote_id)) {
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
    const packageDescription = normalizeText(body.package_description, PACKAGE_DESCRIPTION_MAX_LENGTH);
    if (packageDescription === null) {
      return fail("invalid_request", "package_description must be a non-empty string up to 500 characters", 400);
    }
    req.package_description = packageDescription;
  }

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
        if (!TRACKING_ID_RE.test(trackingId)) {
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

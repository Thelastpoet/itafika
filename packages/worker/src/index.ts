import type { DeliveryRequest, ProviderType, QuoteRequest, TrackingEventCreateRequest, ZoneType } from "@itafika/core";
import {
  appendTrackingEvent,
  listFreshness,
  listModes,
  listZones,
  searchZones,
  trackDelivery,
} from "./db.js";
import { bookDelivery } from "./delivery-service.js";
import { clampLimit, isQuoteId, isTrackingId, parseContact, parseInstructions, parsePackageDescription, parseTrackingNote } from "./validation.js";
import { createQuotes } from "./quote-service.js";
import { listOptions } from "./options-service.js";

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const fail = (code: string, message: string, status: number): Response =>
  json({ error: { code, message } }, status);

const empty = (status: number, headers: HeadersInit): Response => new Response(null, { status, headers });

const methodNotAllowed = (allowedMethods: string[]): Response =>
  new Response(
    JSON.stringify({
      error: {
        code: "method_not_allowed",
        message: `Method not allowed. Use ${allowedMethods.join(" or ")}.`,
      },
    }),
    {
      status: 405,
      headers: {
        "allow": allowedMethods.join(", "),
        "content-type": "application/json",
      },
    },
  );

const options = (allowedMethods: string[]): Response =>
  empty(204, {
    "allow": allowedMethods.join(", "),
  });

const head = (response: Response): Response => {
  const headers = new Headers(response.headers);
  const contentLength = headers.get("content-length");
  if (contentLength !== null) headers.set("content-length", contentLength);
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

async function handleReadRoute(
  method: string,
  handler: () => Promise<Response> | Response,
): Promise<Response> {
  const allowedMethods = ["GET", "HEAD", "OPTIONS"];
  if (method === "OPTIONS") return options(allowedMethods);
  if (method === "HEAD") return head(await handler());
  if (method === "GET") return await handler();
  return methodNotAllowed(allowedMethods);
}

async function handleWriteRoute(
  method: string,
  handler: () => Promise<Response> | Response,
): Promise<Response> {
  const allowedMethods = ["POST", "OPTIONS"];
  if (method === "OPTIONS") return options(allowedMethods);
  if (method === "POST") return await handler();
  return methodNotAllowed(allowedMethods);
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

  const result = await createQuotes(env.itafika, { origin_zone_id, destination_zone_id, package_weight_kg });
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

  if (body.instructions !== undefined) {
    const instructions = parseInstructions(body.instructions);
    if (instructions === null) {
      return fail("invalid_request", "instructions must be a non-empty string up to 500 characters", 400);
    }
    req.instructions = instructions;
  }

  if (body.alternate_collector !== undefined) {
    const alternateCollector = parseContact(body.alternate_collector);
    if (alternateCollector === null) {
      return fail("invalid_request", "alternate_collector.name and alternate_collector.phone must be valid", 400);
    }
    req.alternate_collector = alternateCollector;
  }

  const delivery = await bookDelivery(env.itafika, req);
  if (!delivery) return fail("not_found", "The quote_id is unknown or has expired", 404);
  return json(delivery, 201);
}

async function handleCreateTrackingEvent(request: Request, env: Env, trackingId: string): Promise<Response> {
  let body: Partial<TrackingEventCreateRequest>;
  try {
    body = (await request.json()) as Partial<TrackingEventCreateRequest>;
  } catch {
    return fail("invalid_request", "Request body must be valid JSON", 400);
  }

  if (typeof body.status !== "string") {
    return fail("invalid_request", "status is required", 400);
  }

  const event: TrackingEventCreateRequest = { status: body.status as TrackingEventCreateRequest["status"] };
  if (body.note !== undefined) {
    const note = parseTrackingNote(body.note);
    if (note === null) {
      return fail("invalid_request", "note must be a non-empty string up to 500 characters", 400);
    }
    event.note = note;
  }

  const result = await appendTrackingEvent(env.itafika, trackingId, event, new Date().toISOString());
  if (result === "not_found") return fail("not_found", "Unknown tracking ID", 404);
  if (result === "invalid_transition") {
    return fail("invalid_status_transition", "tracking status cannot move backwards", 409);
  }
  return json(result, 201);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const { method } = request;

    try {
      if (pathname === "/v1/zones") {
        return await handleReadRoute(method, async () => {
          const type = url.searchParams.get("type") as ZoneType | null;
          const town = url.searchParams.get("town");
          const county = url.searchParams.get("county");
          const zones = await listZones(
            env.itafika,
            { type: type ?? undefined, town: town ?? undefined, county: county ?? undefined },
            clampLimit(url.searchParams.get("limit")),
          );
          return json({ zones });
        });
      }

      if (pathname === "/v1/zones/search") {
        return await handleReadRoute(method, async () => {
          const q = url.searchParams.get("q");
          if (!q) return fail("invalid_request", "query parameter q is required", 400);
          const zones = await searchZones(env.itafika, q, clampLimit(url.searchParams.get("limit")));
          return json({ zones });
        });
      }

      if (pathname === "/v1/freshness") {
        return await handleReadRoute(method, async () => {
          const freshness = await listFreshness(env.itafika);
          return json({ freshness });
        });
      }

      if (pathname === "/v1/modes") {
        return await handleReadRoute(method, async () => {
          const modes = await listModes(env.itafika);
          return json({ modes });
        });
      }

      if (pathname === "/v1/options") {
        return await handleReadRoute(method, async () => {
          const originZoneId = url.searchParams.get("origin_zone_id");
          const destinationTown = url.searchParams.get("destination_town");
          if (!originZoneId || !destinationTown) {
            return fail("invalid_request", "origin_zone_id and destination_town are required", 400);
          }
          const mode = url.searchParams.get("mode") as ProviderType | null;
          const result = await listOptions(env.itafika, originZoneId, destinationTown, mode ?? undefined);
          return json(result);
        });
      }

      if (pathname === "/v1/quotes") {
        return await handleWriteRoute(method, async () => await handleQuotes(request, env));
      }

      if (pathname === "/v1/deliveries") {
        return await handleWriteRoute(method, async () => await handleCreateDelivery(request, env));
      }

      const track = pathname.match(/^\/v1\/deliveries\/([^/]+)\/track$/);
      if (track) {
        return await handleReadRoute(method, async () => {
          const trackingId = decodeURIComponent(track[1]!);
          if (!isTrackingId(trackingId)) {
            return fail("invalid_request", "tracking_id must be a valid tracking identifier", 400);
          }
          const result = await trackDelivery(env.itafika, trackingId);
          if (!result) return fail("not_found", "Unknown tracking ID", 404);
          return json(result);
        });
      }

      const events = pathname.match(/^\/v1\/deliveries\/([^/]+)\/events$/);
      if (events) {
        return await handleWriteRoute(method, async () => {
          const trackingId = decodeURIComponent(events[1]!);
          if (!isTrackingId(trackingId)) {
            return fail("invalid_request", "tracking_id must be a valid tracking identifier", 400);
          }
          return await handleCreateTrackingEvent(request, env, trackingId);
        });
      }

      return fail("not_found", `No route for ${method} ${pathname}`, 404);
    } catch {
      return fail("internal_error", "Unexpected error", 500);
    }
  },
} satisfies ExportedHandler<Env>;

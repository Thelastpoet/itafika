import { quote } from "@itafika/core";
import type { Quote, QuoteOption, QuoteRequest, ZoneType } from "@itafika/core";
import { listZones, loadQuoteData, searchZones } from "./db.js";

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const fail = (code: string, message: string, status: number): Response =>
  json({ error: { code, message } }, status);

function clampLimit(raw: string | null): number {
  const n = raw === null ? 100 : Number(raw);
  if (!Number.isFinite(n)) return 100;
  return Math.min(500, Math.max(1, Math.trunc(n)));
}

function withQuoteId(option: QuoteOption): Quote {
  return { quote_id: `qt_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`, ...option };
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

  const data = await loadQuoteData(env.DB, origin_zone_id, destination_zone_id);
  const quotes = quote({ origin_zone_id, destination_zone_id, package_weight_kg }, data).map(withQuoteId);
  return json({ quotes });
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

      return fail("not_found", `No route for ${method} ${pathname}`, 404);
    } catch {
      return fail("internal_error", "Unexpected error", 500);
    }
  },
} satisfies ExportedHandler<Env>;

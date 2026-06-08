import type {
  Delivery,
  DeliveryRequest,
  Provider,
  Quote,
  QuoteData,
  Rate,
  TrackingEvent,
  TrackingResponse,
  TrackingStatus,
  Zone,
  ZoneType,
} from "@itafika/core";

interface ZoneRow {
  id: string;
  name: string;
  type: ZoneType;
  town: string;
  lat: number | null;
  lng: number | null;
}

interface RateRow {
  provider_id: string;
  origin_zone_id: string;
  destination_zone_id: string;
  base_cost_kes: number;
  cost_per_kg_kes: number;
  est_time: string;
  max_weight_kg: number | null;
  source: string;
}

interface QuoteRow {
  quote_id: string;
  provider_type: Quote["provider_type"];
  provider_name: string;
  estimated_cost_kes: number;
  estimated_time: string;
  reliability_score: number | null;
}

function toZone(r: ZoneRow): Zone {
  const zone: Zone = { id: r.id, name: r.name, type: r.type, town: r.town };
  if (r.lat !== null && r.lng !== null) zone.coordinates = { lat: r.lat, lng: r.lng };
  return zone;
}

function toRate(r: RateRow): Rate {
  return { ...r, max_weight_kg: r.max_weight_kg ?? undefined };
}

function toQuote(r: QuoteRow): Quote {
  const quote: Quote = {
    quote_id: r.quote_id,
    provider_type: r.provider_type,
    provider_name: r.provider_name,
    estimated_cost_kes: r.estimated_cost_kes,
    estimated_time: r.estimated_time,
  };
  if (r.reliability_score !== null) quote.reliability_score = r.reliability_score;
  return quote;
}

export async function listZones(db: D1Database, type: ZoneType | undefined, limit: number): Promise<Zone[]> {
  const stmt = type
    ? db.prepare("SELECT * FROM zones WHERE type = ? ORDER BY town, name LIMIT ?").bind(type, limit)
    : db.prepare("SELECT * FROM zones ORDER BY town, name LIMIT ?").bind(limit);
  const { results } = await stmt.all<ZoneRow>();
  return results.map(toZone);
}

export async function searchZones(db: D1Database, q: string, limit: number): Promise<Zone[]> {
  const like = `%${q}%`;
  const { results } = await db
    .prepare("SELECT * FROM zones WHERE name LIKE ? OR town LIKE ? ORDER BY town, name LIMIT ?")
    .bind(like, like, limit)
    .all<ZoneRow>();
  return results.map(toZone);
}

export async function zonesExist(db: D1Database, ...ids: string[]): Promise<boolean> {
  const unique = [...new Set(ids)];
  const placeholders = unique.map(() => "?").join(",");
  const row = await db
    .prepare(`SELECT count(*) AS n FROM zones WHERE id IN (${placeholders})`)
    .bind(...unique)
    .first<{ n: number }>();
  return (row?.n ?? 0) === unique.length;
}

export async function loadQuoteData(db: D1Database, originZoneId: string, destinationZoneId: string): Promise<QuoteData> {
  const [ratesRes, providersRes] = await db.batch<RateRow | Provider>([
    db
      .prepare("SELECT * FROM rates WHERE origin_zone_id = ? AND destination_zone_id = ?")
      .bind(originZoneId, destinationZoneId),
    db.prepare("SELECT * FROM providers"),
  ]);
  return {
    rates: (ratesRes.results as RateRow[]).map(toRate),
    providers: providersRes.results as Provider[],
  };
}

export async function persistQuotes(
  db: D1Database,
  quotes: Quote[],
  originZoneId: string,
  destinationZoneId: string,
  weightKg: number,
  createdAt: string,
): Promise<void> {
  if (quotes.length === 0) return;
  await db.batch(
    quotes.map((q) =>
      db
        .prepare(
          "INSERT INTO quotes (quote_id, provider_type, provider_name, estimated_cost_kes, estimated_time, reliability_score, origin_zone_id, destination_zone_id, package_weight_kg, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(q.quote_id, q.provider_type, q.provider_name, q.estimated_cost_kes, q.estimated_time, q.reliability_score ?? null, originZoneId, destinationZoneId, weightKg, createdAt),
    ),
  );
}

export async function createDelivery(db: D1Database, req: DeliveryRequest): Promise<Delivery | null> {
  const quoteRow = await db.prepare("SELECT * FROM quotes WHERE quote_id = ?").bind(req.quote_id).first<QuoteRow>();
  if (!quoteRow) return null;

  const trackingId = `trk_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  const status: TrackingStatus = "package_picked";
  const createdAt = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        "INSERT INTO deliveries (tracking_id, quote_id, status, sender_name, sender_phone, recipient_name, recipient_phone, package_description, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      )
      .bind(trackingId, req.quote_id, status, req.sender.name, req.sender.phone, req.recipient.name, req.recipient.phone, req.package_description ?? null, createdAt),
    db
      .prepare("INSERT INTO tracking_events (tracking_id, status, at) VALUES (?,?,?)")
      .bind(trackingId, status, createdAt),
  ]);

  return {
    tracking_id: trackingId,
    status,
    quote: toQuote(quoteRow),
    sender: req.sender,
    recipient: req.recipient,
    created_at: createdAt,
  };
}

export async function trackDelivery(db: D1Database, trackingId: string): Promise<TrackingResponse | null> {
  const delivery = await db
    .prepare("SELECT tracking_id, status FROM deliveries WHERE tracking_id = ?")
    .bind(trackingId)
    .first<{ tracking_id: string; status: TrackingStatus }>();
  if (!delivery) return null;

  const { results } = await db
    .prepare("SELECT status, at, note FROM tracking_events WHERE tracking_id = ? ORDER BY id")
    .bind(trackingId)
    .all<{ status: TrackingStatus; at: string; note: string | null }>();

  const history: TrackingEvent[] = results.map((e) => (e.note !== null ? { status: e.status, at: e.at, note: e.note } : { status: e.status, at: e.at }));
  return { tracking_id: delivery.tracking_id, status: delivery.status, history };
}

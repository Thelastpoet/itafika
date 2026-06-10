import type {
  Delivery,
  DeliveryRequest,
  Mode,
  Provider,
  Quote,
  QuoteData,
  Rate,
  TrackingEvent,
  TrackingEventCreateRequest,
  TrackingResponse,
  TrackingStatus,
  Zone,
  ZoneType,
  FreshnessEntry,
} from "@itafika/core";
import { canAdvanceTrackingStatus, latestTrackingStatus } from "@itafika/core";
import type { PersistableQuote } from "./quote-service.js";

interface ZoneRow {
  id: string;
  name: string;
  type: ZoneType;
  town: string;
  county: string | null;
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
  collection_type: Rate["collection_type"];
  source: string;
}

interface FreshnessRow {
  town: string;
  last_updated: string;
}

export interface QuoteRow {
  quote_id: string;
  provider_id: string | null;
  provider_type: Quote["provider_type"];
  provider_name: string;
  estimated_cost_kes: number;
  estimated_time: string;
  reliability_score: number | null;
  origin_zone_id: string;
  destination_zone_id: string;
  collection_type: Quote["collection_type"] | null;
  collection_point_zone_id: string | null;
  collection_point_name: string | null;
  collection_point_town: string | null;
}

function toZone(r: ZoneRow): Zone {
  const zone: Zone = { id: r.id, name: r.name, type: r.type, town: r.town };
  if (r.county !== null && r.county !== "") zone.county = r.county;
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
  if (r.collection_type !== null) quote.collection_type = r.collection_type;
  if (r.collection_point_zone_id !== null && r.collection_point_name !== null) {
    quote.collection_point = { zone_id: r.collection_point_zone_id, name: r.collection_point_name };
    if (r.collection_point_town !== null) quote.collection_point.town = r.collection_point_town;
  }
  return quote;
}

export interface ZoneFilters {
  type?: ZoneType;
  town?: string;
  county?: string;
}

export async function listZones(db: D1Database, filters: ZoneFilters, limit: number): Promise<Zone[]> {
  const clauses: string[] = [];
  const binds: (string | number)[] = [];
  if (filters.type) {
    clauses.push("type = ?");
    binds.push(filters.type);
  }
  if (filters.town) {
    clauses.push("town = ?");
    binds.push(filters.town);
  }
  if (filters.county) {
    clauses.push("county = ?");
    binds.push(filters.county);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")} ` : "";
  const { results } = await db
    .prepare(`SELECT * FROM zones ${where}ORDER BY town, name LIMIT ?`)
    .bind(...binds, limit)
    .all<ZoneRow>();
  return results.map(toZone);
}

export async function getZone(db: D1Database, id: string): Promise<Zone | null> {
  const row = await db.prepare("SELECT * FROM zones WHERE id = ?").bind(id).first<ZoneRow>();
  return row ? toZone(row) : null;
}

export async function searchZones(db: D1Database, q: string, limit: number): Promise<Zone[]> {
  const like = `%${q}%`;
  const { results } = await db
    .prepare("SELECT * FROM zones WHERE name LIKE ? OR town LIKE ? ORDER BY town, name LIMIT ?")
    .bind(like, like, limit)
    .all<ZoneRow>();
  return results.map(toZone);
}

export async function listFreshness(db: D1Database): Promise<FreshnessEntry[]> {
  const { results } = await db.prepare("SELECT town, last_updated FROM freshness ORDER BY town").all<FreshnessRow>();
  return results.map((row) => ({ town: row.town, last_updated: row.last_updated }));
}

export async function listModes(db: D1Database): Promise<Mode[]> {
  const { results } = await db
    .prepare("SELECT id, label, description FROM modes ORDER BY id")
    .all<{ id: Mode["id"]; label: string; description: string | null }>();
  return results.map((row) => {
    const mode: Mode = { id: row.id, label: row.label };
    if (row.description !== null) mode.description = row.description;
    return mode;
  });
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

export interface CoverageData {
  destinationZones: Zone[];
  rates: Rate[];
  providers: Provider[];
}

/**
 * Loads what discovery (/v1/options) needs into a town: the town's zones (the
 * candidate collection points), the rates from the origin into them, and the
 * providers. Returns empty destinationZones if the town is unknown.
 */
export async function loadCoverageData(db: D1Database, originZoneId: string, destinationTown: string): Promise<CoverageData> {
  const zonesRes = await db.prepare("SELECT * FROM zones WHERE town = ? ORDER BY name").bind(destinationTown).all<ZoneRow>();
  const destinationZones = (zonesRes.results as ZoneRow[]).map(toZone);
  if (destinationZones.length === 0) return { destinationZones: [], rates: [], providers: [] };

  const placeholders = destinationZones.map(() => "?").join(",");
  const [ratesRes, providersRes] = await db.batch<RateRow | Provider>([
    db
      .prepare(`SELECT * FROM rates WHERE origin_zone_id = ? AND destination_zone_id IN (${placeholders})`)
      .bind(originZoneId, ...destinationZones.map((z) => z.id)),
    db.prepare("SELECT * FROM providers"),
  ]);
  return {
    destinationZones,
    rates: (ratesRes.results as RateRow[]).map(toRate),
    providers: providersRes.results as Provider[],
  };
}

export async function persistQuotes(
  db: D1Database,
  quotes: PersistableQuote[],
  originZoneId: string,
  destinationZoneId: string,
  weightKg: number,
  createdAt: string,
  expiresAt: string,
): Promise<void> {
  if (quotes.length === 0) return;
  await db.batch(
    quotes.map(({ quote: q, provider_id }) =>
      db
        .prepare(
          "INSERT INTO quotes (quote_id, provider_id, provider_type, provider_name, estimated_cost_kes, estimated_time, reliability_score, origin_zone_id, destination_zone_id, package_weight_kg, created_at, expires_at, collection_type, collection_point_zone_id, collection_point_name, collection_point_town) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          q.quote_id,
          provider_id,
          q.provider_type,
          q.provider_name,
          q.estimated_cost_kes,
          q.estimated_time,
          q.reliability_score ?? null,
          originZoneId,
          destinationZoneId,
          weightKg,
          createdAt,
          expiresAt,
          q.collection_type ?? null,
          q.collection_point?.zone_id ?? null,
          q.collection_point?.name ?? null,
          q.collection_point?.town ?? null,
        ),
    ),
  );
}

export async function pruneExpiredQuotes(db: D1Database, now: string): Promise<void> {
  // Never prune a quote that backs a delivery: the delivery references it for its
  // tracking snapshot, and deleting it both orphans that record and (under D1's
  // foreign-key enforcement) fails the deliveries -> quotes constraint.
  await db
    .prepare(
      "DELETE FROM quotes WHERE expires_at IS NOT NULL AND expires_at <= ? AND NOT EXISTS (SELECT 1 FROM deliveries WHERE deliveries.quote_id = quotes.quote_id)",
    )
    .bind(now)
    .run();
}

/**
 * Returns the quote row only if it is still bookable: it exists, has not expired,
 * and has not already been booked. Returns null otherwise. This runs before the
 * adapter's book() call so the service never dispatches for an invalid quote.
 */
export async function getBookableQuote(db: D1Database, quoteId: string, now: string): Promise<QuoteRow | null> {
  return db
    .prepare(
      "SELECT * FROM quotes WHERE quote_id = ? AND (expires_at IS NULL OR expires_at > ?) AND NOT EXISTS (SELECT 1 FROM deliveries WHERE deliveries.quote_id = quotes.quote_id)",
    )
    .bind(quoteId, now)
    .first<QuoteRow>();
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

/**
 * Persists a booked delivery and its initial tracking event (source 'booking').
 * The status and provider_ref come from the adapter's book() result. Returns null
 * if a concurrent booking won the unique index on deliveries.quote_id.
 */
export async function recordDelivery(
  db: D1Database,
  args: {
    trackingId: string;
    quoteRow: QuoteRow;
    req: DeliveryRequest;
    status: TrackingStatus;
    providerRef: string;
    now: string;
  },
): Promise<Delivery | null> {
  const { trackingId, quoteRow, req, status, providerRef, now } = args;
  const alt = req.alternate_collector;
  try {
    await db.batch([
      db
        .prepare(
          "INSERT INTO deliveries (tracking_id, quote_id, status, provider_ref, sender_name, sender_phone, recipient_name, recipient_phone, package_description, instructions, sender_id_number, recipient_id_number, alternate_collector_name, alternate_collector_phone, alternate_collector_id_number, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          trackingId,
          req.quote_id,
          status,
          providerRef,
          req.sender.name,
          req.sender.phone,
          req.recipient.name,
          req.recipient.phone,
          req.package_description ?? null,
          req.instructions ?? null,
          req.sender.id_number ?? null,
          req.recipient.id_number ?? null,
          alt?.name ?? null,
          alt?.phone ?? null,
          alt?.id_number ?? null,
          now,
        ),
      db
        .prepare("INSERT INTO tracking_events (tracking_id, status, at, source) VALUES (?,?,?,?)")
        .bind(trackingId, status, now, "booking"),
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }

  const delivery: Delivery = {
    tracking_id: trackingId,
    status,
    quote: toQuote(quoteRow),
    sender: req.sender,
    recipient: req.recipient,
    created_at: now,
  };
  if (req.instructions !== undefined) delivery.instructions = req.instructions;
  return delivery;
}

export async function trackDelivery(db: D1Database, trackingId: string): Promise<TrackingResponse | null> {
  const delivery = await db
    .prepare("SELECT tracking_id FROM deliveries WHERE tracking_id = ?")
    .bind(trackingId)
    .first<{ tracking_id: string }>();
  if (!delivery) return null;

  const { results } = await db
    .prepare("SELECT status, at, note FROM tracking_events WHERE tracking_id = ? ORDER BY id")
    .bind(trackingId)
    .all<{ status: TrackingStatus; at: string; note: string | null }>();

  const history: TrackingEvent[] = results.map((e) => (e.note !== null ? { status: e.status, at: e.at, note: e.note } : { status: e.status, at: e.at }));
  const status = latestTrackingStatus(history);
  if (status === null) return null;
  return { tracking_id: delivery.tracking_id, status, history };
}

export async function appendTrackingEvent(
  db: D1Database,
  trackingId: string,
  request: TrackingEventCreateRequest,
  now: string,
): Promise<TrackingResponse | "not_found" | "invalid_transition"> {
  const current = await trackDelivery(db, trackingId);
  if (!current) return "not_found";

  if (!canAdvanceTrackingStatus(current.status, request.status)) {
    return "invalid_transition";
  }

  await db.batch([
    db.prepare("INSERT INTO tracking_events (tracking_id, status, at, note, source) VALUES (?,?,?,?,?)").bind(
      trackingId,
      request.status,
      now,
      request.note ?? null,
      "manual",
    ),
    db.prepare("UPDATE deliveries SET status = ? WHERE tracking_id = ?").bind(request.status, trackingId),
  ]);

  return trackDelivery(db, trackingId) as Promise<TrackingResponse>;
}

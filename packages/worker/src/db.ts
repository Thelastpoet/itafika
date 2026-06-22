import type {
  Delivery,
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
import type { SubmissionOperation, SubmissionTarget } from "./moderation.js";
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

interface ProviderRow {
  id: string;
  name: string;
  type: Provider["type"];
  reliability_score: number | null;
}

function toProvider(r: ProviderRow): Provider {
  const provider: Provider = { id: r.id, name: r.name, type: r.type };
  if (r.reliability_score !== null) provider.reliability_score = r.reliability_score;
  return provider;
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
  const [ratesRes, providersRes] = await db.batch<RateRow | ProviderRow>([
    db
      .prepare("SELECT * FROM rates WHERE origin_zone_id = ? AND destination_zone_id = ?")
      .bind(originZoneId, destinationZoneId),
    db.prepare("SELECT * FROM providers"),
  ]);
  return {
    rates: (ratesRes.results as RateRow[]).map(toRate),
    providers: (providersRes.results as ProviderRow[]).map(toProvider),
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
  const [ratesRes, providersRes] = await db.batch<RateRow | ProviderRow>([
    db
      .prepare(`SELECT * FROM rates WHERE origin_zone_id = ? AND destination_zone_id IN (${placeholders})`)
      .bind(originZoneId, ...destinationZones.map((z) => z.id)),
    db.prepare("SELECT * FROM providers"),
  ]);
  return {
    destinationZones,
    rates: (ratesRes.results as RateRow[]).map(toRate),
    providers: (providersRes.results as ProviderRow[]).map(toProvider),
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

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
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

type DeliveryTrackingStatus =
  | TrackingStatus
  | "booking_requested"
  | "booking_confirmed"
  | "delivery_cancelled";

const DELIVERY_STATUS_ORDER: readonly DeliveryTrackingStatus[] = [
  "booking_requested",
  "booking_confirmed",
  "package_picked",
  "in_transit",
  "at_sorting_hub",
  "ready_for_pickup",
  "delivered",
  "delivery_cancelled",
] as const;

const DELIVERY_STATUS_INDEX = new Map<DeliveryTrackingStatus, number>(
  DELIVERY_STATUS_ORDER.map((status, index) => [status, index]),
);

function canAdvanceDeliveryStatus(current: DeliveryTrackingStatus, next: DeliveryTrackingStatus): boolean {
  if (current === next) return false;
  if (current === "booking_requested") return next === "booking_confirmed" || next === "delivery_cancelled";
  if (current === "booking_confirmed") {
    return (
      next === "package_picked" ||
      next === "in_transit" ||
      next === "at_sorting_hub" ||
      next === "ready_for_pickup" ||
      next === "delivered" ||
      next === "delivery_cancelled"
    );
  }
  if (current === "delivery_cancelled" || current === "delivered") return false;
  return (DELIVERY_STATUS_INDEX.get(next) ?? -1) >= (DELIVERY_STATUS_INDEX.get(current) ?? -1);
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
    .all<{ status: string; at: string; note: string | null }>();

  const history = results.map((e) =>
    e.note !== null
      ? ({ status: e.status as DeliveryTrackingStatus, at: e.at, note: e.note } as TrackingEvent)
      : ({ status: e.status as DeliveryTrackingStatus, at: e.at } as TrackingEvent),
  );
  const status = history.length === 0 ? null : (history[history.length - 1]!.status as DeliveryTrackingStatus);
  if (status === null) return null;
  return { tracking_id: delivery.tracking_id, status: status as TrackingResponse["status"], history };
}

export async function appendTrackingEvent(
  db: D1Database,
  trackingId: string,
  request: TrackingEventCreateRequest,
  now: string,
  source: string = "manual",
): Promise<TrackingResponse | "not_found" | "invalid_transition"> {
  const current = await trackDelivery(db, trackingId);
  if (!current) return "not_found";

  if (!canAdvanceDeliveryStatus(current.status as DeliveryTrackingStatus, request.status as DeliveryTrackingStatus)) {
    return "invalid_transition";
  }

  await db.batch([
    db.prepare("INSERT INTO tracking_events (tracking_id, status, at, note, source) VALUES (?,?,?,?,?)").bind(
      trackingId,
      request.status,
      now,
      request.note ?? null,
      source,
    ),
    db.prepare("UPDATE deliveries SET status = ? WHERE tracking_id = ?").bind(request.status, trackingId),
  ]);

  return trackDelivery(db, trackingId) as Promise<TrackingResponse>;
}

export interface DeliveryBookingRequest {
  quote_id: string;
  shop_order_ref: string;
  shop_handoff_url?: string;
  sender?: {
    name: string;
    phone: string;
    id_number?: string;
  };
  recipient?: {
    name: string;
    phone: string;
    id_number?: string;
  };
  package_description?: string;
  instructions?: string;
  alternate_collector?: {
    name: string;
    phone: string;
    id_number?: string;
  };
}

export interface DeliveryBookingRecordArgs {
  trackingId: string;
  quoteRow: QuoteRow;
  request: DeliveryBookingRequest;
  now: string;
}

export async function recordDeliveryBooking(db: D1Database, args: DeliveryBookingRecordArgs): Promise<Delivery | null> {
  const { trackingId, quoteRow, request, now } = args;
  const sender = request.sender;
  const recipient = request.recipient;
  const alt = request.alternate_collector;

  try {
    await db.batch([
      db
        .prepare(
          "INSERT INTO deliveries (tracking_id, quote_id, status, sender_name, sender_phone, recipient_name, recipient_phone, package_description, instructions, sender_id_number, recipient_id_number, alternate_collector_name, alternate_collector_phone, alternate_collector_id_number, provider_ref, shop_order_ref, shop_handoff_url, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          trackingId,
          request.quote_id,
          "booking_requested",
          sender?.name ?? null,
          sender?.phone ?? null,
          recipient?.name ?? null,
          recipient?.phone ?? null,
          request.package_description ?? null,
          request.instructions ?? null,
          sender?.id_number ?? null,
          recipient?.id_number ?? null,
          alt?.name ?? null,
          alt?.phone ?? null,
          alt?.id_number ?? null,
          null,
          request.shop_order_ref,
          request.shop_handoff_url ?? null,
          now,
        ),
      db
        .prepare("INSERT INTO tracking_events (tracking_id, status, at, source) VALUES (?,?,?,?)")
        .bind(trackingId, "booking_requested", now, "booking"),
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }

  const delivery = {} as unknown as Delivery;
  Object.assign(delivery, {
    tracking_id: trackingId,
    status: "booking_requested" as TrackingResponse["status"],
    quote: toQuote(quoteRow),
    shop_order_ref: request.shop_order_ref,
    created_at: now,
  });
  if (request.shop_handoff_url !== undefined) (delivery as any).shop_handoff_url = request.shop_handoff_url;
  return delivery;
}

export async function setDeliveryProviderRef(db: D1Database, trackingId: string, providerRef: string): Promise<void> {
  await db.prepare("UPDATE deliveries SET provider_ref = ? WHERE tracking_id = ?").bind(providerRef, trackingId).run();
}

export async function appendDeliveryTransition(
  db: D1Database,
  trackingId: string,
  status: DeliveryTrackingStatus,
  now: string,
  source: string,
  note?: string,
): Promise<TrackingResponse | "not_found" | "invalid_transition"> {
  return await appendTrackingEvent(
    db,
    trackingId,
    { status: status as TrackingEventCreateRequest["status"], note },
    now,
    source,
  );
}

export interface ProviderAccountRow {
  id: string;
  provider_id: string;
  display_name: string;
  status: "active" | "disabled";
  created_at: string;
  disabled_at: string | null;
}

export async function hasActiveProviderAccount(db: D1Database, providerId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS one FROM provider_accounts WHERE provider_id = ? AND status = 'active' LIMIT 1")
    .bind(providerId)
    .first<{ one: number }>();
  return row !== null && row !== undefined;
}

export async function getProviderAccountByTokenHash(db: D1Database, tokenHash: string): Promise<ProviderAccountRow | null> {
  const row = await db
    .prepare("SELECT * FROM provider_accounts WHERE token_hash = ?")
    .bind(tokenHash)
    .first<ProviderAccountRow>();
  return row ?? null;
}

export async function getProviderAccountById(db: D1Database, id: string): Promise<ProviderAccountRow | null> {
  const row = await db.prepare("SELECT * FROM provider_accounts WHERE id = ?").bind(id).first<ProviderAccountRow>();
  return row ?? null;
}

export interface ProviderBookingTaskRow {
  id: string;
  delivery_tracking_id: string;
  provider_id: string;
  provider_ref: string | null;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  responded_by: string | null;
  response_note: string | null;
}

export async function createProviderBookingTask(
  db: D1Database,
  args: {
    id: string;
    trackingId: string;
    providerId: string;
    createdAt: string;
    expiresAt: string;
  },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO provider_booking_tasks (id, delivery_tracking_id, provider_id, status, created_at, expires_at) VALUES (?,?,?,?,?,?)",
    )
    .bind(args.id, args.trackingId, args.providerId, "pending", args.createdAt, args.expiresAt)
    .run();
}

export async function getProviderBookingTask(
  db: D1Database,
  taskId: string,
): Promise<ProviderBookingTaskRow | null> {
  const row = await db.prepare("SELECT * FROM provider_booking_tasks WHERE id = ?").bind(taskId).first<ProviderBookingTaskRow>();
  return row ?? null;
}

export async function listProviderBookingTasks(
  db: D1Database,
  providerId: string,
  status?: ProviderBookingTaskRow["status"],
): Promise<ProviderBookingTaskRow[]> {
  const query = status
    ? db
        .prepare("SELECT * FROM provider_booking_tasks WHERE provider_id = ? AND status = ? ORDER BY created_at DESC, id DESC")
        .bind(providerId, status)
    : db.prepare("SELECT * FROM provider_booking_tasks WHERE provider_id = ? ORDER BY created_at DESC, id DESC").bind(providerId);
  const { results } = await query.all<ProviderBookingTaskRow>();
  return results;
}

export async function getProviderBookingTaskForProvider(
  db: D1Database,
  taskId: string,
  providerId: string,
): Promise<ProviderBookingTaskRow | null> {
  const row = await db
    .prepare("SELECT * FROM provider_booking_tasks WHERE id = ? AND provider_id = ?")
    .bind(taskId, providerId)
    .first<ProviderBookingTaskRow>();
  return row ?? null;
}

export async function acceptProviderBookingTask(
  db: D1Database,
  task: ProviderBookingTaskRow,
  accountId: string,
  now: string,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        "UPDATE provider_booking_tasks SET status = 'accepted', responded_at = ?, responded_by = ? WHERE id = ?",
      )
      .bind(now, accountId, task.id),
    db.prepare("UPDATE deliveries SET status = 'booking_confirmed' WHERE tracking_id = ?").bind(task.delivery_tracking_id),
    db
      .prepare("INSERT INTO tracking_events (tracking_id, status, at, source) VALUES (?,?,?,?)")
      .bind(task.delivery_tracking_id, "booking_confirmed", now, "provider"),
  ]);
}

export async function rejectProviderBookingTask(
  db: D1Database,
  task: ProviderBookingTaskRow,
  accountId: string,
  now: string,
  note: string,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        "UPDATE provider_booking_tasks SET status = 'rejected', responded_at = ?, responded_by = ?, response_note = ? WHERE id = ?",
      )
      .bind(now, accountId, note, task.id),
    db.prepare("UPDATE deliveries SET status = 'delivery_cancelled' WHERE tracking_id = ?").bind(task.delivery_tracking_id),
    db
      .prepare("INSERT INTO tracking_events (tracking_id, status, at, source) VALUES (?,?,?,?)")
      .bind(task.delivery_tracking_id, "delivery_cancelled", now, "provider"),
  ]);
}

export async function appendProviderTrackingEvent(
  db: D1Database,
  task: ProviderBookingTaskRow,
  status: Exclude<DeliveryTrackingStatus, "booking_requested" | "booking_confirmed" | "delivery_cancelled">,
  now: string,
  note?: string,
): Promise<TrackingResponse | "invalid_task_state" | "invalid_transition"> {
  if (task.status !== "accepted") return "invalid_task_state";
  const result = await appendTrackingEvent(db, task.delivery_tracking_id, { status: status as TrackingEventCreateRequest["status"], note }, now, "provider");
  if (result === "not_found") return "invalid_task_state";
  return result;
}

function rowKeyWhere(target: SubmissionTarget): string {
  return target === "rates" ? "provider_id = ? AND origin_zone_id = ? AND destination_zone_id = ?" : "id = ?";
}

function rowKeyBinds(target: SubmissionTarget, rowKey: string): string[] {
  return target === "rates" ? rowKey.split("|") : [rowKey];
}

export async function getSubmissionCurrentRow(
  db: D1Database,
  target: SubmissionTarget,
  rowKey: string,
): Promise<Record<string, unknown> | null> {
  const row = await db
    .prepare(`SELECT * FROM ${target} WHERE ${rowKeyWhere(target)}`)
    .bind(...rowKeyBinds(target, rowKey))
    .first<Record<string, unknown>>();
  return row ?? null;
}

export interface ChangeLogRow {
  id: number;
  target: SubmissionTarget;
  operation: SubmissionOperation;
  row_key: string;
  before: string | null;
  after: string;
  source: string;
  changed_by: string;
  submission_id: string | null;
  changed_at: string;
}

export async function listChangeLog(
  db: D1Database,
  filters: { target?: SubmissionTarget; row_key?: string; limit: number },
): Promise<Array<Omit<ChangeLogRow, "before" | "after"> & { before: unknown; after: unknown }>> {
  const clauses: string[] = [];
  const binds: (string | number)[] = [];
  if (filters.target) {
    clauses.push("target = ?");
    binds.push(filters.target);
  }
  if (filters.row_key) {
    clauses.push("row_key = ?");
    binds.push(filters.row_key);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { results } = await db
    .prepare(`SELECT * FROM change_log ${where} ORDER BY id DESC LIMIT ?`)
    .bind(...binds, filters.limit)
    .all<ChangeLogRow>();
  return results.map((row) => ({
    ...row,
    before: row.before === null ? null : (JSON.parse(row.before) as unknown),
    after: JSON.parse(row.after) as unknown,
  }));
}

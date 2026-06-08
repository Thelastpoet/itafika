import type { Provider, QuoteData, Rate, Zone, ZoneType } from "@itafika/core";

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

function toZone(r: ZoneRow): Zone {
  const zone: Zone = { id: r.id, name: r.name, type: r.type, town: r.town };
  if (r.lat !== null && r.lng !== null) zone.coordinates = { lat: r.lat, lng: r.lng };
  return zone;
}

function toRate(r: RateRow): Rate {
  return { ...r, max_weight_kg: r.max_weight_kg ?? undefined };
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

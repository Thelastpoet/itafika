import { createSubmissionId } from "./policy.js";

// ADR 0023: reference-data contributions enter a moderation queue; an approval applies the
// change and records it in the append-only change_log.

export type SubmissionTarget = "rates" | "zones" | "providers" | "modes";
export type SubmissionOperation = "create" | "update";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface SubmissionInput {
  target: SubmissionTarget;
  operation: SubmissionOperation;
  payload: unknown;
  source: string;
  submitted_by: string;
}

export interface Submission {
  id: string;
  target: SubmissionTarget;
  operation: SubmissionOperation;
  payload: unknown;
  source: string;
  submitted_by: string;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

interface SubmissionRow {
  id: string;
  target: SubmissionTarget;
  operation: SubmissionOperation;
  payload: string;
  source: string;
  submitted_by: string;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

function toSubmission(row: SubmissionRow): Submission {
  return { ...row, payload: JSON.parse(row.payload) as unknown };
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function nonNegativeInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function optionalString(v: unknown): v is string | null | undefined {
  return v === null || v === undefined || typeof v === "string";
}

interface Applier<T> {
  parse(payload: unknown): T | null;
  rowKey(p: T): string;
  validate?(db: D1Database, p: T): Promise<boolean>;
  upsert(db: D1Database, p: T): D1PreparedStatement;
}

interface RatesPayload {
  provider_id: string;
  origin_zone_id: string;
  destination_zone_id: string;
  base_cost_kes: number;
  cost_per_kg_kes: number;
  est_time: string;
  max_weight_kg: number | null;
  collection_type: "office_pickup" | "door_delivery";
  source: string;
}

const ratesApplier: Applier<RatesPayload> = {
  parse(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const p = payload as Record<string, unknown>;
    if (!nonEmptyString(p.provider_id)) return null;
    if (!nonEmptyString(p.origin_zone_id)) return null;
    if (!nonEmptyString(p.destination_zone_id)) return null;
    if (!nonNegativeInt(p.base_cost_kes)) return null;
    if (!nonNegativeInt(p.cost_per_kg_kes)) return null;
    if (!nonEmptyString(p.est_time)) return null;
    if (p.max_weight_kg !== null && !(typeof p.max_weight_kg === "number" && p.max_weight_kg > 0)) return null;
    if (p.collection_type !== "office_pickup" && p.collection_type !== "door_delivery") return null;
    if (!nonEmptyString(p.source)) return null;
    return {
      provider_id: p.provider_id,
      origin_zone_id: p.origin_zone_id,
      destination_zone_id: p.destination_zone_id,
      base_cost_kes: p.base_cost_kes,
      cost_per_kg_kes: p.cost_per_kg_kes,
      est_time: p.est_time,
      max_weight_kg: p.max_weight_kg ?? null,
      collection_type: p.collection_type,
      source: p.source,
    };
  },
  rowKey: (p) => `${p.provider_id}|${p.origin_zone_id}|${p.destination_zone_id}`,
  upsert: (db, p) =>
    db
      .prepare(
        `INSERT INTO rates (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, collection_type, source)
         VALUES (?,?,?,?,?,?,?,?,?)
         ON CONFLICT (provider_id, origin_zone_id, destination_zone_id) DO UPDATE SET
           base_cost_kes = excluded.base_cost_kes,
           cost_per_kg_kes = excluded.cost_per_kg_kes,
           est_time = excluded.est_time,
           max_weight_kg = excluded.max_weight_kg,
           collection_type = excluded.collection_type,
           source = excluded.source`,
      )
      .bind(
        p.provider_id,
        p.origin_zone_id,
        p.destination_zone_id,
        p.base_cost_kes,
        p.cost_per_kg_kes,
        p.est_time,
        p.max_weight_kg,
        p.collection_type,
        p.source,
      ),
};

interface ZonePayload {
  id: string;
  name: string;
  type: "cbd_hub" | "stage" | "residential_area";
  town: string;
  county: string | null;
  lat: number | null;
  lng: number | null;
}

const ZONE_TYPES = new Set(["cbd_hub", "stage", "residential_area"]);

const zonesApplier: Applier<ZonePayload> = {
  parse(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const p = payload as Record<string, unknown>;
    if (!nonEmptyString(p.id) || !nonEmptyString(p.name) || !nonEmptyString(p.town)) return null;
    if (typeof p.type !== "string" || !ZONE_TYPES.has(p.type)) return null;
    if (!optionalString(p.county)) return null;
    const lat = p.lat ?? null;
    const lng = p.lng ?? null;
    if ((lat === null) !== (lng === null)) return null;
    if (lat !== null && (typeof lat !== "number" || typeof lng !== "number")) return null;
    return {
      id: p.id,
      name: p.name,
      type: p.type as ZonePayload["type"],
      town: p.town,
      county: (p.county as string | undefined) ?? null,
      lat: lat as number | null,
      lng: lng as number | null,
    };
  },
  rowKey: (p) => p.id,
  upsert: (db, p) =>
    db
      .prepare(
        `INSERT INTO zones (id, name, type, town, county, lat, lng) VALUES (?,?,?,?,?,?,?)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name, type = excluded.type, town = excluded.town,
           county = excluded.county, lat = excluded.lat, lng = excluded.lng`,
      )
      .bind(p.id, p.name, p.type, p.town, p.county, p.lat, p.lng),
};

interface ProviderPayload {
  id: string;
  name: string;
  type: string;
  reliability_score: number | null;
}

const providersApplier: Applier<ProviderPayload> = {
  parse(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const p = payload as Record<string, unknown>;
    if (!nonEmptyString(p.id) || !nonEmptyString(p.name) || !nonEmptyString(p.type)) return null;
    const score = p.reliability_score ?? null;
    if (score !== null && !(typeof score === "number" && score >= 0 && score <= 1)) return null;
    return { id: p.id, name: p.name, type: p.type, reliability_score: score as number | null };
  },
  rowKey: (p) => p.id,
  async validate(db, p) {
    const mode = await db.prepare("SELECT id FROM modes WHERE id = ?").bind(p.type).first();
    return mode !== null;
  },
  upsert: (db, p) =>
    db
      .prepare(
        `INSERT INTO providers (id, name, type, reliability_score) VALUES (?,?,?,?)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name, type = excluded.type, reliability_score = excluded.reliability_score`,
      )
      .bind(p.id, p.name, p.type, p.reliability_score),
};

interface ModePayload {
  id: string;
  label: string;
  description: string | null;
  source: string;
}

const MODE_ID_RE = /^[a-z][a-z0-9_]*$/;

const modesApplier: Applier<ModePayload> = {
  parse(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const p = payload as Record<string, unknown>;
    if (typeof p.id !== "string" || !MODE_ID_RE.test(p.id)) return null;
    if (!nonEmptyString(p.label) || !nonEmptyString(p.source)) return null;
    if (!optionalString(p.description)) return null;
    return { id: p.id, label: p.label, description: (p.description as string | undefined) ?? null, source: p.source };
  },
  rowKey: (p) => p.id,
  upsert: (db, p) =>
    db
      .prepare(
        `INSERT INTO modes (id, label, description, source) VALUES (?,?,?,?)
         ON CONFLICT (id) DO UPDATE SET label = excluded.label, description = excluded.description, source = excluded.source`,
      )
      .bind(p.id, p.label, p.description, p.source),
};

const appliers: { [K in SubmissionTarget]: Applier<unknown> } = {
  rates: ratesApplier as unknown as Applier<unknown>,
  zones: zonesApplier as unknown as Applier<unknown>,
  providers: providersApplier as unknown as Applier<unknown>,
  modes: modesApplier as unknown as Applier<unknown>,
};

function isConstraintError(e: unknown): boolean {
  return e instanceof Error && /constraint|FOREIGN KEY|UNIQUE|NOT NULL|CHECK/i.test(e.message);
}

export async function createSubmission(
  db: D1Database,
  input: SubmissionInput,
  now: string,
): Promise<Submission | null> {
  const applier = appliers[input.target];
  if (!applier || applier.parse(input.payload) === null) return null;

  const id = createSubmissionId();
  await db
    .prepare(
      "INSERT INTO submissions (id, target, operation, payload, source, submitted_by, status, submitted_at) VALUES (?,?,?,?,?,?,'pending',?)",
    )
    .bind(id, input.target, input.operation, JSON.stringify(input.payload), input.source, input.submitted_by, now)
    .run();

  return {
    id,
    target: input.target,
    operation: input.operation,
    payload: input.payload,
    source: input.source,
    submitted_by: input.submitted_by,
    status: "pending",
    submitted_at: now,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
  };
}

export async function listSubmissions(db: D1Database, status?: SubmissionStatus): Promise<Submission[]> {
  const query = status
    ? db.prepare("SELECT * FROM submissions WHERE status = ? ORDER BY submitted_at, id").bind(status)
    : db.prepare("SELECT * FROM submissions ORDER BY submitted_at, id");
  const { results } = await query.all<SubmissionRow>();
  return results.map(toSubmission);
}

export async function getSubmission(db: D1Database, id: string): Promise<Submission | null> {
  const row = await db.prepare("SELECT * FROM submissions WHERE id = ?").bind(id).first<SubmissionRow>();
  return row ? toSubmission(row) : null;
}

export type ReviewResult =
  | { ok: true; submission: Submission }
  | { ok: false; reason: "not_found" | "already_reviewed" | "invalid_payload" };

export async function approveSubmission(
  db: D1Database,
  id: string,
  reviewer: string,
  reviewNote: string | null,
  now: string,
): Promise<ReviewResult> {
  const existing = await getSubmission(db, id);
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.status !== "pending") return { ok: false, reason: "already_reviewed" };

  const applier = appliers[existing.target];
  const parsed = applier.parse(existing.payload);
  if (parsed === null) return { ok: false, reason: "invalid_payload" };
  if (applier.validate && !(await applier.validate(db, parsed))) return { ok: false, reason: "invalid_payload" };

  const rowKey = applier.rowKey(parsed);
  const before = await db
    .prepare(`SELECT * FROM ${existing.target} WHERE ${rowKeyWhere(existing.target)}`)
    .bind(...rowKeyBinds(existing.target, rowKey))
    .first();

  try {
    await db.batch([
      applier.upsert(db, parsed),
      db
        .prepare(
          "INSERT INTO change_log (target, operation, row_key, before, after, source, changed_by, submission_id, changed_at) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          existing.target,
          existing.operation,
          rowKey,
          before ? JSON.stringify(before) : null,
          JSON.stringify(parsed),
          existing.source,
          reviewer,
          id,
          now,
        ),
      db
        .prepare("UPDATE submissions SET status = 'approved', reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ?")
        .bind(reviewer, now, reviewNote, id),
    ]);
  } catch (e) {
    if (isConstraintError(e)) return { ok: false, reason: "invalid_payload" };
    throw e;
  }

  return { ok: true, submission: (await getSubmission(db, id))! };
}

function rowKeyWhere(target: SubmissionTarget): string {
  return target === "rates"
    ? "provider_id = ? AND origin_zone_id = ? AND destination_zone_id = ?"
    : "id = ?";
}

function rowKeyBinds(target: SubmissionTarget, rowKey: string): string[] {
  return target === "rates" ? rowKey.split("|") : [rowKey];
}

export async function rejectSubmission(
  db: D1Database,
  id: string,
  reviewer: string,
  reviewNote: string | null,
  now: string,
): Promise<ReviewResult> {
  const existing = await getSubmission(db, id);
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.status !== "pending") return { ok: false, reason: "already_reviewed" };

  await db
    .prepare("UPDATE submissions SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ?")
    .bind(reviewer, now, reviewNote, id)
    .run();

  return { ok: true, submission: (await getSubmission(db, id))! };
}

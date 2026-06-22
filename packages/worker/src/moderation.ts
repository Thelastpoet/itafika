import { createSubmissionId } from "./policy.js";
import { getSubmissionCurrentRow as loadCurrentRow, listChangeLog as loadChangeLogRows } from "./db.js";

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

export interface ChangeLogEntry {
  id: number;
  target: SubmissionTarget;
  operation: SubmissionOperation;
  row_key: string;
  before: unknown;
  after: unknown;
  source: string;
  changed_by: string;
  submission_id: string | null;
  changed_at: string;
}

interface Applier<T> {
  parse(payload: unknown): T | null;
  rowKey(payload: T): string;
  validate?(db: D1Database, payload: T): Promise<boolean>;
  upsert(db: D1Database, payload: T): D1PreparedStatement;
}

const REDACTION_MARKER = "[redacted-retention]";
const MODE_ID_RE = /^[a-z][a-z0-9_]*$/;
const PROVIDER_ID_RE = /^[a-z][a-z0-9_]*$/;
const ZONE_ID_RE = /^ZONE_[A-Z0-9]+_(CBD|STG|RES)_[0-9]{2}$/;
const ZONE_TYPES = new Set(["cbd_hub", "stage", "residential_area"]);
const COLLECTION_TYPES = new Set(["office_pickup", "door_delivery"]);
const SUBMISSION_TARGETS = new Set<SubmissionTarget>(["rates", "zones", "providers", "modes"]);
const SUBMISSION_OPERATIONS = new Set<SubmissionOperation>(["create", "update"]);

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : null;
}

function parseStoredPayload(raw: string): unknown {
  if (raw === REDACTION_MARKER) return REDACTION_MARKER;
  return JSON.parse(raw) as unknown;
}

function toSubmission(row: SubmissionRow): Submission {
  return { ...row, payload: parseStoredPayload(row.payload) };
}

interface RatePayload {
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

const ratesApplier: Applier<RatePayload> = {
  parse(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const p = payload as Record<string, unknown>;
    if (!nonEmptyString(p.provider_id)) return null;
    if (!nonEmptyString(p.origin_zone_id)) return null;
    if (!nonEmptyString(p.destination_zone_id)) return null;
    if (!nonNegativeInt(p.base_cost_kes)) return null;
    if (!nonNegativeInt(p.cost_per_kg_kes)) return null;
    if (!nonEmptyString(p.est_time)) return null;
    if (p.max_weight_kg !== null && p.max_weight_kg !== undefined && !(typeof p.max_weight_kg === "number" && p.max_weight_kg > 0)) return null;
    if (p.collection_type !== "office_pickup" && p.collection_type !== "door_delivery") return null;
    if (!nonEmptyString(p.source)) return null;
    return {
      provider_id: p.provider_id,
      origin_zone_id: p.origin_zone_id,
      destination_zone_id: p.destination_zone_id,
      base_cost_kes: p.base_cost_kes,
      cost_per_kg_kes: p.cost_per_kg_kes,
      est_time: p.est_time,
      max_weight_kg: p.max_weight_kg === undefined ? null : (p.max_weight_kg as number | null),
      collection_type: p.collection_type,
      source: p.source,
    };
  },
  rowKey: (p) => `${p.provider_id}|${p.origin_zone_id}|${p.destination_zone_id}`,
  validate: async (db, p) => {
    const provider = await db.prepare("SELECT 1 AS one FROM providers WHERE id = ?").bind(p.provider_id).first<{ one: number }>();
    if (!provider) return false;

    const [originZone, destinationZone] = await Promise.all([
      db.prepare("SELECT 1 AS one FROM zones WHERE id = ?").bind(p.origin_zone_id).first<{ one: number }>(),
      db.prepare("SELECT 1 AS one FROM zones WHERE id = ?").bind(p.destination_zone_id).first<{ one: number }>(),
    ]);
    return Boolean(originZone && destinationZone);
  },
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
  county: string;
  lat: number | null;
  lng: number | null;
}

const zonesApplier: Applier<ZonePayload> = {
  parse(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const p = payload as Record<string, unknown>;
    if (!nonEmptyString(p.id) || !ZONE_ID_RE.test(p.id)) return null;
    if (!nonEmptyString(p.name)) return null;
    if (!nonEmptyString(p.town)) return null;
    if (!nonEmptyString(p.county)) return null;
    if (typeof p.type !== "string" || !ZONE_TYPES.has(p.type)) return null;
    if (!Object.prototype.hasOwnProperty.call(p, "lat") || !Object.prototype.hasOwnProperty.call(p, "lng")) return null;
    const lat = p.lat === null ? null : typeof p.lat === "number" ? p.lat : null;
    const lng = p.lng === null ? null : typeof p.lng === "number" ? p.lng : null;
    if ((lat === null) !== (lng === null)) return null;
    if (lat !== null && (lat < -5 || lat > 5)) return null;
    if (lng !== null && (lng < 33 || lng > 42)) return null;
    return {
      id: p.id,
      name: p.name,
      type: p.type as ZonePayload["type"],
      town: p.town,
      county: p.county,
      lat,
      lng,
    };
  },
  rowKey: (p) => p.id,
  upsert: (db, p) =>
    db
      .prepare(
        `INSERT INTO zones (id, name, type, town, county, lat, lng) VALUES (?,?,?,?,?,?,?)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           type = excluded.type,
           town = excluded.town,
           county = excluded.county,
           lat = excluded.lat,
           lng = excluded.lng`,
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
    if (!nonEmptyString(p.id) || !PROVIDER_ID_RE.test(p.id)) return null;
    if (!nonEmptyString(p.name)) return null;
    if (!nonEmptyString(p.type)) return null;
    if (p.reliability_score !== null && p.reliability_score !== undefined && !(typeof p.reliability_score === "number" && p.reliability_score >= 0 && p.reliability_score <= 1)) return null;
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      reliability_score: p.reliability_score === undefined ? null : (p.reliability_score as number | null),
    };
  },
  rowKey: (p) => p.id,
  validate: async (db, p) => {
    const mode = await db.prepare("SELECT 1 AS one FROM modes WHERE id = ?").bind(p.type).first<{ one: number }>();
    return mode !== null && mode !== undefined;
  },
  upsert: (db, p) =>
    db
      .prepare(
        `INSERT INTO providers (id, name, type, reliability_score) VALUES (?,?,?,?)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           type = excluded.type,
           reliability_score = excluded.reliability_score`,
      )
      .bind(p.id, p.name, p.type, p.reliability_score),
};

interface ModePayload {
  id: string;
  label: string;
  description: string | null;
  source: string;
}

const modesApplier: Applier<ModePayload> = {
  parse(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const p = payload as Record<string, unknown>;
    if (!nonEmptyString(p.id) || !MODE_ID_RE.test(p.id)) return null;
    if (!nonEmptyString(p.label)) return null;
    if (!nonEmptyString(p.source)) return null;
    const description = parseNullableString(p.description);
    if (p.description !== undefined && description === null) return null;
    return { id: p.id, label: p.label, description, source: p.source };
  },
  rowKey: (p) => p.id,
  upsert: (db, p) =>
    db
      .prepare(
        `INSERT INTO modes (id, label, description, source) VALUES (?,?,?,?)
         ON CONFLICT (id) DO UPDATE SET
           label = excluded.label,
           description = excluded.description,
           source = excluded.source`,
      )
      .bind(p.id, p.label, p.description, p.source),
};

const appliers: { [K in SubmissionTarget]: Applier<unknown> } = {
  rates: ratesApplier as unknown as Applier<unknown>,
  zones: zonesApplier as unknown as Applier<unknown>,
  providers: providersApplier as unknown as Applier<unknown>,
  modes: modesApplier as unknown as Applier<unknown>,
};

function rowKeyWhere(target: SubmissionTarget): string {
  return target === "rates" ? "provider_id = ? AND origin_zone_id = ? AND destination_zone_id = ?" : "id = ?";
}

function rowKeyBinds(target: SubmissionTarget, rowKey: string): string[] {
  return target === "rates" ? rowKey.split("|") : [rowKey];
}

async function loadExistingRow(db: D1Database, target: SubmissionTarget, rowKey: string): Promise<Record<string, unknown> | null> {
  return await loadCurrentRow(db, target, rowKey);
}

function isConstraintError(error: unknown): boolean {
  return error instanceof Error && /constraint|FOREIGN KEY|UNIQUE|NOT NULL|CHECK/i.test(error.message);
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

export async function listSubmissions(
  db: D1Database,
  status?: SubmissionStatus,
  target?: SubmissionTarget,
): Promise<Submission[]> {
  const clauses: string[] = [];
  const binds: (string | number)[] = [];
  if (status) {
    clauses.push("status = ?");
    binds.push(status);
  }
  if (target) {
    clauses.push("target = ?");
    binds.push(target);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const query = db.prepare(`SELECT * FROM submissions ${where} ORDER BY submitted_at, id`).bind(...binds);
  const { results } = await query.all<SubmissionRow>();
  return (results ?? []).map(toSubmission);
}

export async function getSubmission(db: D1Database, id: string): Promise<Submission | null> {
  const row = await db.prepare("SELECT * FROM submissions WHERE id = ?").bind(id).first<SubmissionRow>();
  return row ? toSubmission(row) : null;
}

export async function getSubmissionDetails(
  db: D1Database,
  id: string,
): Promise<{ submission: Submission; current_row: Record<string, unknown> | null } | null> {
  const submission = await getSubmission(db, id);
  if (!submission) return null;
  const applier = appliers[submission.target];
  const parsed = applier.parse(submission.payload);
  const current_row = parsed ? await loadCurrentRow(db, submission.target, applier.rowKey(parsed as never)) : null;
  return { submission, current_row };
}

export type ReviewResult =
  | { ok: true; submission: Submission }
  | { ok: false; reason: "not_found" | "already_reviewed" | "invalid_payload" | "row_exists" | "row_missing" };

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

  const rowKey = applier.rowKey(parsed as never);
  const currentRow = await loadExistingRow(db, existing.target, rowKey);
  if (existing.operation === "create" && currentRow) return { ok: false, reason: "row_exists" };
  if (existing.operation === "update" && !currentRow) return { ok: false, reason: "row_missing" };
  if (applier.validate && !(await applier.validate(db, parsed as never))) return { ok: false, reason: "invalid_payload" };

  try {
    await db.batch([
      applier.upsert(db, parsed as never),
      db
        .prepare(
          "INSERT INTO change_log (target, operation, row_key, before, after, source, changed_by, submission_id, changed_at) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          existing.target,
          existing.operation,
          rowKey,
          currentRow ? JSON.stringify(currentRow) : null,
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
  } catch (error) {
    if (isConstraintError(error)) {
      return { ok: false, reason: "invalid_payload" };
    }
    throw error;
  }

  return { ok: true, submission: (await getSubmission(db, id))! };
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
  if (!nonEmptyString(reviewNote)) return { ok: false, reason: "invalid_payload" };

  await db
    .prepare("UPDATE submissions SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ?")
    .bind(reviewer, now, reviewNote, id)
    .run();

  return { ok: true, submission: (await getSubmission(db, id))! };
}

export async function getChangeLog(
  db: D1Database,
  filters: { target?: SubmissionTarget; row_key?: string; limit: number },
): Promise<ChangeLogEntry[]> {
  return (await loadChangeLogRows(db, filters)).map((row) => row as ChangeLogEntry);
}

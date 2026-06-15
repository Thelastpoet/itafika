import { createSubmissionId } from "./policy.js";

// ADR 0023: reference-data contributions enter a moderation queue; an approval applies the
// change and records it in the append-only change_log. This increment handles the `rates`
// target; other targets plug into the same flow later.

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

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function nonNegativeInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function parseRatesPayload(payload: unknown): RatesPayload | null {
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
    max_weight_kg: p.max_weight_kg,
    collection_type: p.collection_type,
    source: p.source,
  };
}

export async function createSubmission(
  db: D1Database,
  input: SubmissionInput,
  now: string,
): Promise<Submission | null> {
  if (input.target === "rates" && parseRatesPayload(input.payload) === null) return null;

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
    ? db
        .prepare("SELECT * FROM submissions WHERE status = ? ORDER BY submitted_at, id")
        .bind(status)
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
  | { ok: false; reason: "not_found" | "already_reviewed" | "unsupported_target" | "invalid_payload" };

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
  if (existing.target !== "rates") return { ok: false, reason: "unsupported_target" };

  const payload = parseRatesPayload(existing.payload);
  if (payload === null) return { ok: false, reason: "invalid_payload" };

  const rowKey = `${payload.provider_id}|${payload.origin_zone_id}|${payload.destination_zone_id}`;
  const before = await db
    .prepare("SELECT * FROM rates WHERE provider_id = ? AND origin_zone_id = ? AND destination_zone_id = ?")
    .bind(payload.provider_id, payload.origin_zone_id, payload.destination_zone_id)
    .first();

  await db.batch([
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
        payload.provider_id,
        payload.origin_zone_id,
        payload.destination_zone_id,
        payload.base_cost_kes,
        payload.cost_per_kg_kes,
        payload.est_time,
        payload.max_weight_kg,
        payload.collection_type,
        payload.source,
      ),
    db
      .prepare(
        "INSERT INTO change_log (target, operation, row_key, before, after, source, changed_by, submission_id, changed_at) VALUES ('rates',?,?,?,?,?,?,?,?)",
      )
      .bind(
        existing.operation,
        rowKey,
        before ? JSON.stringify(before) : null,
        JSON.stringify(payload),
        payload.source,
        reviewer,
        id,
        now,
      ),
    db
      .prepare("UPDATE submissions SET status = 'approved', reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ?")
      .bind(reviewer, now, reviewNote, id),
  ]);

  const submission = await getSubmission(db, id);
  return { ok: true, submission: submission! };
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

  const submission = await getSubmission(db, id);
  return { ok: true, submission: submission! };
}

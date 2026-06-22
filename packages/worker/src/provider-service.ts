import type { Submission, SubmissionInput } from "./moderation.js";
import type { ProviderAccount } from "./provider-auth.js";
import {
  acceptProviderBookingTask,
  appendProviderTrackingEvent,
  getProviderBookingTaskForProvider,
  listProviderBookingTasks,
  rejectProviderBookingTask,
  type ProviderBookingTaskRow,
} from "./db.js";
import { createSubmission } from "./moderation.js";

export interface ProviderBookingSummary {
  id: string;
  tracking_id: string;
  status: ProviderBookingTaskRow["status"];
  created_at: string;
  expires_at: string;
}

export interface ProviderBookingDetail {
  booking: {
    id: string;
    tracking_id: string;
    status: ProviderBookingTaskRow["status"];
    created_at: string;
    expires_at: string;
    responded_at: string | null;
    response_note: string | null;
  };
  delivery: {
    tracking_id: string;
    status: string;
    shop_order_ref: string | null;
    shop_handoff_url: string | null;
  };
  quote: {
    provider_name: string;
    origin_zone_id: string;
    destination_zone_id: string;
    estimated_cost_kes: number;
    estimated_time: string;
  };
}

export async function createProviderSubmission(
  db: D1Database,
  account: ProviderAccount,
  input: SubmissionInput,
  now: string,
): Promise<Submission | null> {
  if (input.target !== "rates") return null;
  const payload = input.payload as Record<string, unknown> | null;
  if (typeof payload !== "object" || payload === null) return null;
  if (payload.provider_id !== account.provider_id) return null;

  return await createSubmission(
    db,
    {
      ...input,
      submitted_by: account.display_name,
    },
    now,
  );
}

export async function listProviderBookings(db: D1Database, providerId: string, status?: ProviderBookingTaskRow["status"]): Promise<ProviderBookingSummary[]> {
  return (await listProviderBookingTasks(db, providerId, status)).map((task) => ({
    id: task.id,
    tracking_id: task.delivery_tracking_id,
    status: task.status,
    created_at: task.created_at,
    expires_at: task.expires_at,
  }));
}

export async function getProviderBooking(
  db: D1Database,
  providerId: string,
  id: string,
): Promise<ProviderBookingDetail | null> {
  const task = await getProviderBookingTaskForProvider(db, id, providerId);
  if (!task) return null;

  const row = await db
    .prepare(
      `SELECT
         t.id AS id,
         t.delivery_tracking_id AS delivery_tracking_id,
         t.status AS task_status,
         t.created_at AS created_at,
         t.expires_at AS expires_at,
         t.responded_at AS responded_at,
         t.response_note AS response_note,
         d.status AS delivery_status,
         d.shop_order_ref AS shop_order_ref,
         d.shop_handoff_url AS shop_handoff_url,
         q.provider_name AS provider_name,
         q.origin_zone_id AS origin_zone_id,
         q.destination_zone_id AS destination_zone_id,
         q.estimated_cost_kes AS estimated_cost_kes,
         q.estimated_time AS estimated_time
       FROM provider_booking_tasks t
       JOIN deliveries d ON d.tracking_id = t.delivery_tracking_id
       JOIN quotes q ON q.quote_id = d.quote_id
       WHERE t.id = ? AND t.provider_id = ?`,
    )
    .bind(id, providerId)
    .first<{
      id: string;
      delivery_tracking_id: string;
      task_status: ProviderBookingTaskRow["status"];
      created_at: string;
      expires_at: string;
      responded_at: string | null;
      response_note: string | null;
      delivery_status: string;
      shop_order_ref: string | null;
      shop_handoff_url: string | null;
      provider_name: string;
      origin_zone_id: string;
      destination_zone_id: string;
      estimated_cost_kes: number;
      estimated_time: string;
    }>();

  if (!row) return null;

  return {
    booking: {
      id: row.id,
      tracking_id: row.delivery_tracking_id,
      status: row.task_status,
      created_at: row.created_at,
      expires_at: row.expires_at,
      responded_at: row.responded_at,
      response_note: row.response_note,
    },
    delivery: {
      tracking_id: row.delivery_tracking_id,
      status: row.delivery_status,
      shop_order_ref: row.shop_order_ref,
      shop_handoff_url: row.shop_handoff_url,
    },
    quote: {
      provider_name: row.provider_name,
      origin_zone_id: row.origin_zone_id,
      destination_zone_id: row.destination_zone_id,
      estimated_cost_kes: row.estimated_cost_kes,
      estimated_time: row.estimated_time,
    },
  };
}

export async function acceptProviderBooking(
  db: D1Database,
  providerId: string,
  id: string,
  accountId: string,
  now: string,
): Promise<{ ok: true; booking: ProviderBookingDetail } | { ok: false; reason: "not_found" | "invalid_task_state" }> {
  const task = await getProviderBookingTaskForProvider(db, id, providerId);
  if (!task) return { ok: false, reason: "not_found" };
  if (task.status !== "pending") return { ok: false, reason: "invalid_task_state" };

  await acceptProviderBookingTask(db, task, accountId, now);
  const booking = await getProviderBooking(db, providerId, id);
  if (!booking) return { ok: false, reason: "not_found" };
  return { ok: true, booking };
}

export async function rejectProviderBooking(
  db: D1Database,
  providerId: string,
  id: string,
  accountId: string,
  now: string,
  note: string,
): Promise<{ ok: true; booking: ProviderBookingDetail } | { ok: false; reason: "not_found" | "invalid_task_state" }> {
  const task = await getProviderBookingTaskForProvider(db, id, providerId);
  if (!task) return { ok: false, reason: "not_found" };
  if (task.status !== "pending") return { ok: false, reason: "invalid_task_state" };

  await rejectProviderBookingTask(db, task, accountId, now, note);
  const booking = await getProviderBooking(db, providerId, id);
  if (!booking) return { ok: false, reason: "not_found" };
  return { ok: true, booking };
}

export async function appendProviderBookingEvent(
  db: D1Database,
  providerId: string,
  id: string,
  now: string,
  status: "package_picked" | "in_transit" | "at_sorting_hub" | "ready_for_pickup" | "delivered",
  note?: string,
): Promise<
  | { ok: true; booking: ProviderBookingDetail }
  | { ok: false; reason: "not_found" | "invalid_task_state" | "invalid_status_transition" }
> {
  const task = await getProviderBookingTaskForProvider(db, id, providerId);
  if (!task) return { ok: false, reason: "not_found" };

  const result = await appendProviderTrackingEvent(db, task, status, now, note);
  if (result === "invalid_task_state") return { ok: false, reason: "invalid_task_state" };
  if (result === "invalid_transition") return { ok: false, reason: "invalid_status_transition" };

  const booking = await getProviderBooking(db, providerId, id);
  if (!booking) return { ok: false, reason: "not_found" };
  return { ok: true, booking };
}

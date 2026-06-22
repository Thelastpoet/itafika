import { addDays } from "./policy.js";

const REDACTION_MARKER = "[redacted-retention]";

export interface MaintenanceResult {
  expiredProviderTasks: number;
  deletedQuotes: number;
  redactedDeliveries: number;
  deletedRejectedSubmissions: number;
  redactedApprovedSubmissions: number;
}

async function fetchAll<T>(stmt: D1PreparedStatement): Promise<T[]> {
  const { results } = await stmt.all<T>();
  return results ?? [];
}

export async function runDailyMaintenance(db: D1Database, now: string): Promise<MaintenanceResult> {
  const expiredProviderTasks = await expireProviderTasks(db, now);
  const deletedQuotes = await deleteUnusedQuotes(db, addDays(now, -7));
  const redactedDeliveries = await redactTerminalDeliveries(db);
  const deletedRejectedSubmissions = await deleteRejectedSubmissions(db, addDays(now, -365));
  const redactedApprovedSubmissions = await redactApprovedSubmissions(db, addDays(now, -365));

  return {
    expiredProviderTasks,
    deletedQuotes,
    redactedDeliveries,
    deletedRejectedSubmissions,
    redactedApprovedSubmissions,
  };
}

async function expireProviderTasks(db: D1Database, now: string): Promise<number> {
  const rows = await fetchAll<{ id: string; delivery_tracking_id: string; provider_id: string }>(
    db
      .prepare(
        "SELECT id, delivery_tracking_id, provider_id FROM provider_booking_tasks WHERE status = 'pending' AND expires_at < ? ORDER BY created_at, id",
      )
      .bind(now),
  );

  for (const row of rows) {
    await db.batch([
      db
        .prepare(
          "UPDATE provider_booking_tasks SET status = 'expired', responded_at = ?, response_note = ? WHERE id = ?",
        )
        .bind(now, "expired", row.id),
      db.prepare("UPDATE deliveries SET status = ? WHERE tracking_id = ?").bind("delivery_cancelled", row.delivery_tracking_id),
      db
        .prepare("INSERT INTO tracking_events (tracking_id, status, at, source) VALUES (?,?,?,?)")
        .bind(row.delivery_tracking_id, "delivery_cancelled", now, "provider"),
    ]);
  }

  return rows.length;
}

async function deleteUnusedQuotes(db: D1Database, cutoff: string): Promise<number> {
  const result = await db
    .prepare(
      "DELETE FROM quotes WHERE created_at < ? AND NOT EXISTS (SELECT 1 FROM deliveries WHERE deliveries.quote_id = quotes.quote_id)",
    )
    .bind(cutoff)
    .run();
  return result.meta.changes;
}

async function redactTerminalDeliveries(db: D1Database): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE deliveries
       SET sender_name = NULL,
           sender_phone = NULL,
           recipient_name = NULL,
           recipient_phone = NULL,
           package_description = NULL,
           instructions = NULL,
           sender_id_number = NULL,
           recipient_id_number = NULL,
           alternate_collector_name = NULL,
           alternate_collector_phone = NULL,
           alternate_collector_id_number = NULL
       WHERE status IN ('delivered', 'delivery_cancelled')
         AND (
           sender_name IS NOT NULL OR
           sender_phone IS NOT NULL OR
           recipient_name IS NOT NULL OR
           recipient_phone IS NOT NULL OR
           package_description IS NOT NULL OR
           instructions IS NOT NULL OR
           sender_id_number IS NOT NULL OR
           recipient_id_number IS NOT NULL OR
           alternate_collector_name IS NOT NULL OR
           alternate_collector_phone IS NOT NULL OR
           alternate_collector_id_number IS NOT NULL
         )`,
    )
    .run();
  return result.meta.changes;
}

async function deleteRejectedSubmissions(db: D1Database, cutoff: string): Promise<number> {
  const result = await db
    .prepare("DELETE FROM submissions WHERE status = 'rejected' AND reviewed_at < ?")
    .bind(cutoff)
    .run();
  return result.meta.changes;
}

async function redactApprovedSubmissions(db: D1Database, cutoff: string): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE submissions
       SET payload = ?,
           source = ?,
           submitted_by = ?
       WHERE status = 'approved' AND submitted_at < ?`,
    )
    .bind(REDACTION_MARKER, REDACTION_MARKER, REDACTION_MARKER, cutoff)
    .run();
  return result.meta.changes;
}

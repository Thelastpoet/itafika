// ADR 0023 + 0024: the open dataset is published by reading the reference tables only.
// This list is an explicit allowlist — personal data (deliveries, tracking, submissions)
// is never part of the export.
const REFERENCE_TABLES = ["zones", "modes", "providers", "rates", "freshness"] as const;

export async function exportReferenceData(db: D1Database, generatedAt: string) {
  const [zones, modes, providers, rates, freshness] = await Promise.all(
    REFERENCE_TABLES.map((t) => db.prepare(`SELECT * FROM ${t}`).all().then((r) => r.results)),
  );
  return { generated_at: generatedAt, zones, modes, providers, rates, freshness };
}

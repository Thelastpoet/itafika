const REFERENCE_TABLES = ["zones", "modes", "providers", "rates", "freshness"] as const;

export interface ReferenceExport {
  export_version: 1;
  generated_at: string;
  source: "itafika-d1";
  tables: {
    zones: unknown[];
    modes: unknown[];
    providers: unknown[];
    rates: unknown[];
    freshness: unknown[];
  };
  row_counts: {
    zones: number;
    modes: number;
    providers: number;
    rates: number;
    freshness: number;
  };
}

function countRows(rows: readonly unknown[]): number {
  return rows.length;
}

export async function exportReferenceData(db: D1Database, generatedAt: string): Promise<ReferenceExport> {
  const [zones, modes, providers, rates, freshness] = await Promise.all(
    REFERENCE_TABLES.map((t) => db.prepare(`SELECT * FROM ${t}`).all().then((r) => r.results ?? [])),
  );

  return {
    export_version: 1,
    generated_at: generatedAt,
    source: "itafika-d1",
    tables: {
      zones,
      modes,
      providers,
      rates,
      freshness,
    },
    row_counts: {
      zones: countRows(zones),
      modes: countRows(modes),
      providers: countRows(providers),
      rates: countRows(rates),
      freshness: countRows(freshness),
    },
  };
}

export const REFERENCE_EXPORTS_PREFIX = "reference/";
export const REFERENCE_EXPORT_LATEST_KEY = `${REFERENCE_EXPORTS_PREFIX}latest.json`;

export function referenceExportArchiveKey(generatedAt: string): string {
  return `${REFERENCE_EXPORTS_PREFIX}archive/${generatedAt}.json`;
}

export async function writeReferenceExportSnapshot(
  bucket: R2Bucket,
  exportData: ReferenceExport,
  archiveKey: string,
): Promise<void> {
  const body = JSON.stringify(exportData);
  await Promise.all([
    bucket.put(REFERENCE_EXPORT_LATEST_KEY, body, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    }),
    bucket.put(archiveKey, body, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    }),
  ]);
}

export async function readReferenceExportSnapshot(bucket: R2Bucket): Promise<ReferenceExport | null> {
  const object = await bucket.get(REFERENCE_EXPORT_LATEST_KEY);
  if (!object) return null;
  const text = await object.text();
  try {
    return JSON.parse(text) as ReferenceExport;
  } catch {
    return null;
  }
}

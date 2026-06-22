import { SELF, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import {
  exportReferenceData,
  readReferenceExportSnapshot,
  referenceExportArchiveKey,
  writeReferenceExportSnapshot,
} from "../src/export-service.js";
import { safeUtcTimestampKey } from "../src/policy.js";

class MemoryBucket {
  #objects = new Map<string, string>();

  async put(key: string, value: string): Promise<void> {
    this.#objects.set(key, value);
  }

  async get(key: string): Promise<{ text: () => Promise<string> } | null> {
    const value = this.#objects.get(key);
    if (value === undefined) return null;
    return { text: async () => value };
  }

  keys(): string[] {
    return [...this.#objects.keys()].sort();
  }
}

beforeAll(async () => {
  await env.itafika.batch([
    env.itafika.prepare("INSERT OR IGNORE INTO zones (id, name, type, town, county, lat, lng) VALUES (?,?,?,?,?,?,?)").bind("ZONE_NBI_CBD_01", "RNG Plaza", "cbd_hub", "Nairobi", "Nairobi", -1.2841, 36.8255),
    env.itafika.prepare("INSERT OR IGNORE INTO zones (id, name, type, town, county, lat, lng) VALUES (?,?,?,?,?,?,?)").bind("ZONE_ELD_MAIN", "Eldoret Main Stage", "stage", "Eldoret", "Uasin Gishu", 0.5143, 35.2698),
    env.itafika.prepare("INSERT OR IGNORE INTO modes (id, label, description, source) VALUES (?,?,?,?)").bind("matatu_sacco", "Matatu SACCO", "Shared-taxi SACCO parcel desk.", "seed-illustrative"),
    env.itafika.prepare("INSERT OR IGNORE INTO providers (id, name, type, reliability_score) VALUES (?,?,?,?)").bind("mololine", "Mololine Sacco", "matatu_sacco", 0.98),
    env.itafika.prepare("INSERT OR IGNORE INTO rates (provider_id, origin_zone_id, destination_zone_id, base_cost_kes, cost_per_kg_kes, est_time, max_weight_kg, source) VALUES (?,?,?,?,?,?,?,?)").bind("mololine", "ZONE_NBI_CBD_01", "ZONE_ELD_MAIN", 500, 20, "5 hours", 20, "test"),
    env.itafika.prepare("INSERT OR IGNORE INTO freshness (town, last_updated) VALUES (?,?)").bind("Nairobi", "2026-06-22"),
    env.itafika.prepare("INSERT OR IGNORE INTO freshness (town, last_updated) VALUES (?,?)").bind("Eldoret", "2026-06-22"),
  ]);
});

describe("public export", () => {
  it("includes export metadata, row counts, and only allowlisted tables", async () => {
    const res = await SELF.fetch("https://api.itafika.dev/v1/export");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      export_version: number;
      generated_at: string;
      source: string;
      tables: Record<string, unknown[]>;
      row_counts: Record<string, number>;
    };

    expect(body.export_version).toBe(1);
    expect(body.source).toBe("itafika-d1");
    expect(Object.keys(body.tables).sort()).toEqual(["freshness", "modes", "providers", "rates", "zones"]);
    expect(Object.keys(body.row_counts).sort()).toEqual(["freshness", "modes", "providers", "rates", "zones"]);
    expect(body.row_counts.zones).toBeGreaterThan(0);
    expect(body.row_counts.providers).toBeGreaterThan(0);
    expect(body.row_counts.rates).toBeGreaterThan(0);
  });

  it("returns 503 before the first generated snapshot exists", async () => {
    const res = await SELF.fetch("https://api.itafika.dev/v1/export/latest");
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("export_unavailable");
  });

  it("writes the latest and archive snapshot keys", async () => {
    const bucket = new MemoryBucket();
    const generatedAt = "2026-06-22T02:10:00.000Z";
    const snapshot = await exportReferenceData(env.itafika, generatedAt);
    const archiveKey = referenceExportArchiveKey(safeUtcTimestampKey(generatedAt));

    await writeReferenceExportSnapshot(bucket as never, snapshot, archiveKey);

    expect(bucket.keys()).toEqual(["reference/archive/2026-06-22T02-10-00Z.json", "reference/latest.json"]);
    await expect(readReferenceExportSnapshot(bucket as never)).resolves.toMatchObject({
      export_version: 1,
      generated_at: generatedAt,
      source: "itafika-d1",
    });
  });
});

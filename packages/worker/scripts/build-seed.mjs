import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "csv-parse/sync";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "../../../spec/data");
const out = join(here, "../seed.sql");

const readCsv = (file) =>
  parse(readFileSync(join(dataDir, file), "utf8"), { columns: true, skip_empty_lines: true, trim: true });

const sql = (v) => {
  if (v === undefined || v === null || v === "") return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

const insert = (table, cols, rows) => {
  if (rows.length === 0) return "";
  const values = rows
    .map((r) => `  (${cols.map((c) => sql(r[c])).join(", ")})`)
    .join(",\n");
  return `INSERT INTO ${table} (${cols.join(", ")}) VALUES\n${values};\n`;
};

const statements = [
  "PRAGMA defer_foreign_keys = TRUE;",
  "DELETE FROM rates;",
  "DELETE FROM providers;",
  "DELETE FROM zones;",
  "DELETE FROM freshness;",
  insert("zones", ["id", "name", "type", "town", "lat", "lng"], readCsv("zones.csv")),
  insert("providers", ["id", "name", "type", "reliability_score"], readCsv("providers.csv")),
  insert(
    "rates",
    ["provider_id", "origin_zone_id", "destination_zone_id", "base_cost_kes", "cost_per_kg_kes", "est_time", "max_weight_kg", "source"],
    readCsv("rates.csv"),
  ),
  insert("freshness", ["town", "last_updated"], readCsv("freshness.csv")),
];

writeFileSync(out, statements.filter(Boolean).join("\n") + "\n");
console.log(`Wrote ${out}`);

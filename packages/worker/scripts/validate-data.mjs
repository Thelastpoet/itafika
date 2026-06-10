import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "csv-parse/sync";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "../../../spec/data");

const zoneTypes = new Set(["cbd_hub", "stage", "residential_area"]);
const collectionTypes = new Set(["office_pickup", "door_delivery"]);
const zoneIdRe = /^ZONE_[A-Z]{3}_[A-Z]{3,4}(?:_\d{2})?$/;
const modeIdRe = /^[a-z][a-z0-9_]*$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

function readCsv(file) {
  return parse(readFileSync(join(dataDir, file), "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function fail(errors) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

function requireNonEmpty(row, field, context, errors) {
  if (!row[field]) errors.push(`${context}: missing ${field}`);
}

function parseNumber(value, context, errors, options = {}) {
  if (value === "" || value === undefined) {
    if (options.allowBlank) return null;
    errors.push(`${context}: missing numeric value`);
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    errors.push(`${context}: invalid number "${value}"`);
    return null;
  }
  if (options.integer && !Number.isInteger(n)) {
    errors.push(`${context}: expected integer, got "${value}"`);
  }
  if (options.min !== undefined && n < options.min) {
    errors.push(`${context}: must be >= ${options.min}, got "${value}"`);
  }
  if (options.max !== undefined && n > options.max) {
    errors.push(`${context}: must be <= ${options.max}, got "${value}"`);
  }
  return n;
}

const zones = readCsv("zones.csv");
const modes = readCsv("modes.csv");
const providers = readCsv("providers.csv");
const rates = readCsv("rates.csv");
const freshness = readCsv("freshness.csv");
const errors = [];

// Transport modes are a governed registry (ADR 0019), not a closed enum: the set of
// valid provider types is whatever modes.csv declares, validated as an FK below.
const modeIds = new Set();
for (const [index, row] of modes.entries()) {
  const context = `modes.csv row ${index + 2}`;
  requireNonEmpty(row, "id", context, errors);
  requireNonEmpty(row, "label", context, errors);
  requireNonEmpty(row, "source", context, errors);

  if (row.id) {
    if (!modeIdRe.test(row.id)) errors.push(`${context}: invalid mode id "${row.id}" (use lowercase snake_case)`);
    if (modeIds.has(row.id)) errors.push(`${context}: duplicate mode id "${row.id}"`);
    modeIds.add(row.id);
  }
}

const zoneIds = new Set();
for (const [index, row] of zones.entries()) {
  const context = `zones.csv row ${index + 2}`;
  requireNonEmpty(row, "id", context, errors);
  requireNonEmpty(row, "name", context, errors);
  requireNonEmpty(row, "type", context, errors);
  requireNonEmpty(row, "town", context, errors);
  requireNonEmpty(row, "county", context, errors);

  if (row.id) {
    if (!zoneIdRe.test(row.id)) errors.push(`${context}: invalid zone id "${row.id}"`);
    if (zoneIds.has(row.id)) errors.push(`${context}: duplicate zone id "${row.id}"`);
    zoneIds.add(row.id);
  }

  if (row.type && !zoneTypes.has(row.type)) errors.push(`${context}: invalid zone type "${row.type}"`);

  const lat = row.lat === "" ? null : parseNumber(row.lat, `${context} lat`, errors);
  const lng = row.lng === "" ? null : parseNumber(row.lng, `${context} lng`, errors);
  if ((lat === null) !== (lng === null)) errors.push(`${context}: lat and lng must both be set or both be blank`);
}

const providerIds = new Set();
for (const [index, row] of providers.entries()) {
  const context = `providers.csv row ${index + 2}`;
  requireNonEmpty(row, "id", context, errors);
  requireNonEmpty(row, "name", context, errors);
  requireNonEmpty(row, "type", context, errors);
  requireNonEmpty(row, "reliability_score", context, errors);

  if (row.id) {
    if (providerIds.has(row.id)) errors.push(`${context}: duplicate provider id "${row.id}"`);
    providerIds.add(row.id);
  }

  if (row.type && !modeIds.has(row.type)) errors.push(`${context}: unknown mode "${row.type}" (add it to modes.csv)`);
  parseNumber(row.reliability_score, `${context} reliability_score`, errors, { min: 0, max: 1 });
}

const rateKeys = new Set();
for (const [index, row] of rates.entries()) {
  const context = `rates.csv row ${index + 2}`;
  requireNonEmpty(row, "provider_id", context, errors);
  requireNonEmpty(row, "origin_zone_id", context, errors);
  requireNonEmpty(row, "destination_zone_id", context, errors);
  requireNonEmpty(row, "base_cost_kes", context, errors);
  requireNonEmpty(row, "cost_per_kg_kes", context, errors);
  requireNonEmpty(row, "est_time", context, errors);
  requireNonEmpty(row, "collection_type", context, errors);
  requireNonEmpty(row, "source", context, errors);

  if (row.collection_type && !collectionTypes.has(row.collection_type)) {
    errors.push(`${context}: invalid collection_type "${row.collection_type}"`);
  }

  if (row.provider_id && !providerIds.has(row.provider_id)) errors.push(`${context}: unknown provider_id "${row.provider_id}"`);
  if (row.origin_zone_id && !zoneIds.has(row.origin_zone_id)) errors.push(`${context}: unknown origin_zone_id "${row.origin_zone_id}"`);
  if (row.destination_zone_id && !zoneIds.has(row.destination_zone_id)) errors.push(`${context}: unknown destination_zone_id "${row.destination_zone_id}"`);

  const key = `${row.provider_id}:${row.origin_zone_id}:${row.destination_zone_id}`;
  if (rateKeys.has(key)) errors.push(`${context}: duplicate rate for ${key}`);
  rateKeys.add(key);

  parseNumber(row.base_cost_kes, `${context} base_cost_kes`, errors, { integer: true, min: 0 });
  parseNumber(row.cost_per_kg_kes, `${context} cost_per_kg_kes`, errors, { integer: true, min: 0 });
  parseNumber(row.max_weight_kg, `${context} max_weight_kg`, errors, { allowBlank: true, min: 0 });
}

const towns = new Set(zones.map((row) => row.town));
const freshnessTowns = new Set();
for (const [index, row] of freshness.entries()) {
  const context = `freshness.csv row ${index + 2}`;
  requireNonEmpty(row, "town", context, errors);
  requireNonEmpty(row, "last_updated", context, errors);

  if (row.town) {
    if (freshnessTowns.has(row.town)) errors.push(`${context}: duplicate town "${row.town}"`);
    freshnessTowns.add(row.town);
    if (!towns.has(row.town)) errors.push(`${context}: town "${row.town}" is not present in zones.csv`);
  }

  if (row.last_updated && !dateRe.test(row.last_updated)) {
    errors.push(`${context}: invalid date "${row.last_updated}", expected YYYY-MM-DD`);
  }
}

for (const town of towns) {
  if (!freshnessTowns.has(town)) {
    errors.push(`freshness.csv: missing town "${town}" required by zones.csv`);
  }
}

if (errors.length > 0) fail(errors);

console.log("spec/data validation passed");

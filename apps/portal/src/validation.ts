import type {
  ProviderSubmissionRequest,
  SubmissionCreateRequest,
  SubmissionOperation,
  SubmissionTarget,
} from "@itafika/core";

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export interface RateFormValues {
  provider_id: string;
  origin_zone_id: string;
  destination_zone_id: string;
  base_cost_kes: string;
  cost_per_kg_kes: string;
  est_time: string;
  max_weight_kg: string;
  collection_type: string;
  source: string;
}

export interface ZoneFormValues {
  id: string;
  name: string;
  type: string;
  town: string;
  county: string;
  lat: string;
  lng: string;
}

export interface ProviderFormValues {
  id: string;
  name: string;
  type: string;
  reliability_score: string;
  source: string;
}

export interface ModeFormValues {
  id: string;
  label: string;
  description: string;
  source: string;
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function parseInteger(value: string): number | null {
  if (!nonEmpty(value)) return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function parseFloatValue(value: string): number | null {
  if (!nonEmpty(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function validateRateForm(values: RateFormValues): FieldErrors<keyof RateFormValues> {
  const errors: FieldErrors<keyof RateFormValues> = {};
  if (!nonEmpty(values.provider_id)) errors.provider_id = "Choose a provider.";
  if (!nonEmpty(values.origin_zone_id)) errors.origin_zone_id = "Choose an origin zone.";
  if (!nonEmpty(values.destination_zone_id)) errors.destination_zone_id = "Choose a destination zone.";

  const baseCost = parseInteger(values.base_cost_kes);
  if (baseCost === null || baseCost < 0) errors.base_cost_kes = "Base cost must be a whole number at 0 or above.";

  const perKg = parseInteger(values.cost_per_kg_kes);
  if (perKg === null || perKg < 0) errors.cost_per_kg_kes = "Per-kg cost must be a whole number at 0 or above.";

  if (!nonEmpty(values.est_time)) errors.est_time = "Enter an estimate.";

  if (nonEmpty(values.max_weight_kg)) {
    const maxWeight = parseFloatValue(values.max_weight_kg);
    if (maxWeight === null || maxWeight <= 0) errors.max_weight_kg = "Max weight must be a positive number.";
  }

  if (values.collection_type !== "office_pickup" && values.collection_type !== "door_delivery") {
    errors.collection_type = "Choose a collection type.";
  }

  if (!nonEmpty(values.source)) errors.source = "Enter the source for this submission.";
  return errors;
}

export function validateZoneForm(values: ZoneFormValues): FieldErrors<keyof ZoneFormValues> {
  const errors: FieldErrors<keyof ZoneFormValues> = {};
  if (!/^ZONE_[A-Z0-9]+_(CBD|STG|RES)_[0-9]{2}$/.test(values.id)) errors.id = "Use the ZONE_XXX_CBD_01 pattern.";
  if (!nonEmpty(values.name)) errors.name = "Enter a zone name.";
  if (values.type !== "cbd_hub" && values.type !== "stage" && values.type !== "residential_area") {
    errors.type = "Choose a zone type.";
  }
  if (!nonEmpty(values.town)) errors.town = "Enter the town.";
  if (!nonEmpty(values.county)) errors.county = "Enter the county.";

  const hasLat = nonEmpty(values.lat);
  const hasLng = nonEmpty(values.lng);
  if (hasLat !== hasLng) {
    errors.lat = "Latitude and longitude must both be set or both blank.";
    errors.lng = "Latitude and longitude must both be set or both blank.";
  } else if (hasLat && hasLng) {
    const lat = parseFloatValue(values.lat);
    const lng = parseFloatValue(values.lng);
    if (lat === null || lat < -5 || lat > 5) errors.lat = "Latitude must be between -5 and 5.";
    if (lng === null || lng < 33 || lng > 42) errors.lng = "Longitude must be between 33 and 42.";
  }

  return errors;
}

export function validateProviderForm(values: ProviderFormValues): FieldErrors<keyof ProviderFormValues> {
  const errors: FieldErrors<keyof ProviderFormValues> = {};
  if (!/^[a-z][a-z0-9_]*$/.test(values.id)) errors.id = "Use lowercase letters, numbers, or underscores.";
  if (!nonEmpty(values.name)) errors.name = "Enter a provider name.";
  if (!nonEmpty(values.type)) errors.type = "Choose a transport mode.";
  if (nonEmpty(values.reliability_score)) {
    const score = parseFloatValue(values.reliability_score);
    if (score === null || score < 0 || score > 1) errors.reliability_score = "Use a score from 0 to 1.";
  }
  if (!nonEmpty(values.source)) errors.source = "Enter the source for this submission.";
  return errors;
}

export function validateModeForm(values: ModeFormValues): FieldErrors<keyof ModeFormValues> {
  const errors: FieldErrors<keyof ModeFormValues> = {};
  if (!/^[a-z][a-z0-9_]*$/.test(values.id)) errors.id = "Use lowercase letters, numbers, or underscores.";
  if (!nonEmpty(values.label)) errors.label = "Enter a mode label.";
  if (!nonEmpty(values.source)) errors.source = "Enter the source for this submission.";
  return errors;
}

export function toSubmissionRequest(
  target: SubmissionTarget,
  operation: SubmissionOperation,
  payload: Record<string, unknown>,
  source: string,
  submitted_by: string,
): SubmissionCreateRequest {
  return { target, operation, payload, source, submitted_by };
}

export function toProviderSubmissionRequest(
  operation: SubmissionOperation,
  payload: Record<string, unknown>,
  source: string,
): ProviderSubmissionRequest {
  return { target: "rates", operation, payload, source };
}

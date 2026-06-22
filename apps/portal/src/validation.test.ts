import { describe, expect, it } from "vitest";

import {
  validateModeForm,
  validateProviderForm,
  validateRateForm,
  validateZoneForm,
} from "./validation.js";

describe("validateRateForm", () => {
  it("reports required fields", () => {
    expect(
      validateRateForm({
        provider_id: "",
        origin_zone_id: "",
        destination_zone_id: "",
        base_cost_kes: "",
        cost_per_kg_kes: "",
        est_time: "",
        max_weight_kg: "",
        collection_type: "",
        source: "",
      }),
    ).toMatchObject({
      provider_id: "Choose a provider.",
      origin_zone_id: "Choose an origin zone.",
      destination_zone_id: "Choose a destination zone.",
      base_cost_kes: "Base cost must be a whole number at 0 or above.",
      cost_per_kg_kes: "Per-kg cost must be a whole number at 0 or above.",
      est_time: "Enter an estimate.",
      collection_type: "Choose a collection type.",
      source: "Enter the source for this submission.",
    });
  });
});

describe("validateZoneForm", () => {
  it("reports required fields", () => {
    expect(
      validateZoneForm({
        id: "bad",
        name: "",
        type: "",
        town: "",
        county: "",
        lat: "",
        lng: "",
      }),
    ).toMatchObject({
      id: "Use the ZONE_XXX_CBD_01 pattern.",
      name: "Enter a zone name.",
      type: "Choose a zone type.",
      town: "Enter the town.",
      county: "Enter the county.",
    });
  });
});

describe("validateProviderForm", () => {
  it("reports required fields", () => {
    expect(
      validateProviderForm({
        id: "",
        name: "",
        type: "",
        reliability_score: "",
        source: "",
      }),
    ).toMatchObject({
      id: "Use lowercase letters, numbers, or underscores.",
      name: "Enter a provider name.",
      type: "Choose a transport mode.",
      source: "Enter the source for this submission.",
    });
  });
});

describe("validateModeForm", () => {
  it("reports required fields", () => {
    expect(
      validateModeForm({
        id: "",
        label: "",
        description: "",
        source: "",
      }),
    ).toMatchObject({
      id: "Use lowercase letters, numbers, or underscores.",
      label: "Enter a mode label.",
      source: "Enter the source for this submission.",
    });
  });
});

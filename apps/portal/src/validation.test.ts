import { describe, expect, it } from "vitest";

import {
  buildZoneId,
  nextZoneSequence,
  slugId,
  validateModeForm,
  validateNewProvider,
  validateNewZone,
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

describe("validateRateForm origin vs destination", () => {
  const base = {
    provider_id: "mololine",
    origin_zone_id: "ZONE_NBI_CBD_01",
    destination_zone_id: "ZONE_NBI_CBD_01",
    base_cost_kes: "350",
    cost_per_kg_kes: "0",
    est_time: "3 hours",
    max_weight_kg: "",
    collection_type: "office_pickup",
    source: "desk call",
  };

  it("rejects identical origin and destination", () => {
    expect(validateRateForm(base).destination_zone_id).toBe("Origin and destination must be different.");
  });

  it("accepts distinct origin and destination", () => {
    expect(validateRateForm({ ...base, destination_zone_id: "ZONE_NYR_STG_01" })).toEqual({});
  });
});

describe("slugId", () => {
  it("produces a backend-valid provider id", () => {
    expect(slugId("Mololine Sacco")).toBe("mololine_sacco");
    expect(slugId("  2NK Express ")).toBe("x_2nk_express");
    expect(slugId("!!!")).toBe("");
  });
});

describe("buildZoneId / nextZoneSequence", () => {
  it("builds a pattern-valid zone id with the right type segment", () => {
    expect(buildZoneId("Nyeri", "stage", [])).toBe("ZONE_NYERI_STG_01");
    expect(buildZoneId("Nairobi", "cbd_hub", [])).toBe("ZONE_NAIROBI_CBD_01");
    expect(buildZoneId("Thika", "residential_area", [])).toBe("ZONE_THIKA_RES_01");
  });

  it("increments the sequence past existing ids", () => {
    expect(nextZoneSequence(["ZONE_NYERI_STG_01", "ZONE_NYERI_STG_02"], "NYERI", "STG")).toBe("03");
    expect(buildZoneId("Nyeri", "stage", ["ZONE_NYERI_STG_01"])).toBe("ZONE_NYERI_STG_02");
  });
});

describe("validateNewProvider / validateNewZone", () => {
  it("requires name and mode for a provider", () => {
    expect(validateNewProvider({ name: "", type: "" })).toMatchObject({
      name: "Enter the provider name.",
      type: "Choose how they move parcels.",
    });
  });

  it("requires name, town, county for a place", () => {
    expect(validateNewZone({ name: "", type: "stage", town: "", county: "", lat: "", lng: "" })).toMatchObject({
      name: "Enter the place name.",
      town: "Enter the town.",
      county: "Enter the county.",
    });
  });
});

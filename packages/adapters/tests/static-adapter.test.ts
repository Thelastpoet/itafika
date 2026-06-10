import { describe, expect, it } from "vitest";
import { StaticRateAdapter } from "../src/index.js";

const provider = {
  id: "mololine",
  name: "Mololine Sacco",
  type: "matatu_sacco" as const,
  reliability_score: 0.98,
};

const rates = [
  {
    provider_id: "mololine",
    origin_zone_id: "ZONE_NBI_CBD_01",
    destination_zone_id: "ZONE_NKR_MAIN",
    base_cost_kes: 600,
    cost_per_kg_kes: 0,
    est_time: "2 hours",
    max_weight_kg: 20,
    collection_type: "office_pickup" as const,
    source: "test",
  },
  {
    provider_id: "mololine",
    origin_zone_id: "ZONE_NBI_CBD_01",
    destination_zone_id: "ZONE_NKR_MAIN",
    base_cost_kes: 400,
    cost_per_kg_kes: 0,
    est_time: "3 hours",
    max_weight_kg: 20,
    collection_type: "office_pickup" as const,
    source: "test",
  },
  {
    provider_id: "mololine",
    origin_zone_id: "ZONE_NBI_CBD_01",
    destination_zone_id: "ZONE_ELD_MAIN",
    base_cost_kes: 500,
    cost_per_kg_kes: 20,
    est_time: "5 hours",
    max_weight_kg: 20,
    collection_type: "door_delivery" as const,
    source: "test",
  },
];

const zones = [
  { id: "ZONE_NKR_MAIN", name: "Nakuru Main Stage", type: "stage" as const, town: "Nakuru" },
  { id: "ZONE_ELD_MAIN", name: "Eldoret Main Stage", type: "stage" as const, town: "Eldoret" },
];

describe("StaticRateAdapter", () => {
  const adapter = new StaticRateAdapter({ provider, rates, zones });

  it("returns a quote for a served route", async () => {
    await expect(
      adapter.quote({
        origin_zone_id: "ZONE_NBI_CBD_01",
        destination_zone_id: "ZONE_ELD_MAIN",
        package_weight_kg: 2.5,
      }),
    ).resolves.toEqual({
      estimated_cost_kes: 560,
      estimated_time: "5 hours",
      reliability_score: 0.98,
      collection_type: "door_delivery",
    });
  });

  it("chooses the cheapest applicable rate for the provider", async () => {
    await expect(
      adapter.quote({
        origin_zone_id: "ZONE_NBI_CBD_01",
        destination_zone_id: "ZONE_NKR_MAIN",
        package_weight_kg: 2,
      }),
    ).resolves.toEqual({
      estimated_cost_kes: 400,
      estimated_time: "3 hours",
      reliability_score: 0.98,
      collection_type: "office_pickup",
      collection_point: { zone_id: "ZONE_NKR_MAIN", name: "Nakuru Main Stage", town: "Nakuru" },
    });
  });

  it("returns null for an unserved route", async () => {
    await expect(
      adapter.quote({
        origin_zone_id: "ZONE_NBI_CBD_01",
        destination_zone_id: "ZONE_NOWHERE",
        package_weight_kg: 2,
      }),
    ).resolves.toBeNull();
  });

  it("returns null when the weight cap is exceeded", async () => {
    await expect(
      adapter.quote({
        origin_zone_id: "ZONE_NBI_CBD_01",
        destination_zone_id: "ZONE_NKR_MAIN",
        package_weight_kg: 25,
      }),
    ).resolves.toBeNull();
  });

  it("creates a provider-side booking reference", async () => {
    const result = await adapter.book({
      quote_id: "qt_b1a56ce02d7345f398ee2c04",
      origin_zone_id: "ZONE_NBI_CBD_01",
      destination_zone_id: "ZONE_NKR_MAIN",
      sender: { name: "Asha Mwangi", phone: "+254712345678" },
      recipient: { name: "John Otieno", phone: "+254723456789" },
    });

    expect(result.status).toBe("package_picked");
    expect(result.provider_ref).toMatch(/^mololine_[a-f0-9]{32}$/);
  });

  it("reports coverage into a town with named collection points and a from-cost", async () => {
    // Nakuru has two office_pickup rates (cheapest 400).
    await expect(
      adapter.coverage({ origin_zone_id: "ZONE_NBI_CBD_01", destination_town: "Nakuru" }),
    ).resolves.toEqual([
      {
        collection_type: "office_pickup",
        collection_points: [{ zone_id: "ZONE_NKR_MAIN", name: "Nakuru Main Stage", town: "Nakuru" }],
        from_cost_kes: 400,
      },
    ]);
  });

  it("returns no coverage for a town it does not serve", async () => {
    await expect(
      adapter.coverage({ origin_zone_id: "ZONE_NBI_CBD_01", destination_town: "Atlantis" }),
    ).resolves.toEqual([]);
  });
});

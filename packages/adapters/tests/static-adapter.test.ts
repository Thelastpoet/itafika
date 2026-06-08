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
    source: "test",
  },
];

describe("StaticRateAdapter", () => {
  const adapter = new StaticRateAdapter({ provider, rates });

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
});

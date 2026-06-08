import { describe, expect, it } from "vitest";
import { estimateCostKes, quote, rateAppliesToWeight } from "../src/quote.js";
import type { Provider, Rate } from "../src/types.js";

const providers: Provider[] = [
  { id: "cbd_rider_pool", name: "Independent Rider (CBD Pool)", type: "boda_rider", reliability_score: 0.92 },
  { id: "mololine", name: "Mololine Sacco", type: "matatu_sacco", reliability_score: 0.98 },
  { id: "g4s", name: "G4S Courier", type: "national_courier", reliability_score: 0.99 },
];

const rates: Rate[] = [
  // flat-rate rider, no per-kg
  { provider_id: "cbd_rider_pool", origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_NBI_RES_01", base_cost_kes: 300, cost_per_kg_kes: 0, est_time: "45 mins", max_weight_kg: 15, source: "seed-illustrative" },
  // per-kg sacco with a weight cap
  { provider_id: "mololine", origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_ELD_MAIN", base_cost_kes: 500, cost_per_kg_kes: 20, est_time: "5 hours", max_weight_kg: 20, source: "seed-illustrative" },
  // courier on the same route, pricier but more reliable
  { provider_id: "g4s", origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_ELD_MAIN", base_cost_kes: 650, cost_per_kg_kes: 40, est_time: "next day", max_weight_kg: 50, source: "seed-illustrative" },
];

describe("estimateCostKes", () => {
  it("is the base cost for a flat-rate provider", () => {
    expect(estimateCostKes({ base_cost_kes: 300, cost_per_kg_kes: 0 }, 2.5)).toBe(300);
  });

  it("adds cost-per-kg using the ceiling of the weight", () => {
    // 500 + ceil(2.5)=3 * 20 = 560
    expect(estimateCostKes({ base_cost_kes: 500, cost_per_kg_kes: 20 }, 2.5)).toBe(560);
  });

  it("rounds to the nearest 10 KES", () => {
    expect(estimateCostKes({ base_cost_kes: 404, cost_per_kg_kes: 0 }, 1)).toBe(400);
    expect(estimateCostKes({ base_cost_kes: 405, cost_per_kg_kes: 0 }, 1)).toBe(410);
  });
});

describe("rateAppliesToWeight", () => {
  it("accepts any weight when no cap is set", () => {
    expect(rateAppliesToWeight({ max_weight_kg: undefined }, 999)).toBe(true);
  });

  it("accepts weights at or below the cap and rejects above", () => {
    expect(rateAppliesToWeight({ max_weight_kg: 20 }, 20)).toBe(true);
    expect(rateAppliesToWeight({ max_weight_kg: 20 }, 20.1)).toBe(false);
  });
});

describe("quote", () => {
  const data = { rates, providers };

  it("returns every applicable option for a route, cheapest first", () => {
    const options = quote(
      { origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_ELD_MAIN", package_weight_kg: 2.5 },
      data,
    );
    expect(options.map((o) => o.provider_name)).toEqual(["Mololine Sacco", "G4S Courier"]);
    expect(options[0]).toMatchObject({
      provider_type: "matatu_sacco",
      estimated_cost_kes: 560,
      estimated_time: "5 hours",
      reliability_score: 0.98,
    });
  });

  it("prefers higher reliability for higher-care package types", () => {
    const options = quote(
      {
        origin_zone_id: "ZONE_NBI_CBD_01",
        destination_zone_id: "ZONE_ELD_MAIN",
        package_weight_kg: 2.5,
        package_type: "electronics",
      },
      data,
    );
    expect(options.map((o) => o.provider_name)).toEqual(["G4S Courier", "Mololine Sacco"]);
  });

  it("excludes rates whose weight cap is exceeded", () => {
    const options = quote(
      { origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_ELD_MAIN", package_weight_kg: 30 },
      data,
    );
    // mololine caps at 20kg; only g4s (cap 50) remains
    expect(options.map((o) => o.provider_name)).toEqual(["G4S Courier"]);
  });

  it("returns an empty list for an unserved route", () => {
    const options = quote(
      { origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_NOWHERE", package_weight_kg: 1 },
      data,
    );
    expect(options).toEqual([]);
  });

  it("skips rates whose provider is missing from the dataset", () => {
    const options = quote(
      { origin_zone_id: "ZONE_NBI_CBD_01", destination_zone_id: "ZONE_ELD_MAIN", package_weight_kg: 2.5 },
      { rates, providers: providers.filter((p) => p.id !== "mololine") },
    );
    expect(options.map((o) => o.provider_name)).toEqual(["G4S Courier"]);
  });

  it("does not treat the reverse route as the same route (symmetry isn't assumed)", () => {
    const options = quote(
      { origin_zone_id: "ZONE_ELD_MAIN", destination_zone_id: "ZONE_NBI_CBD_01", package_weight_kg: 2.5 },
      data,
    );
    expect(options).toEqual([]);
  });
});

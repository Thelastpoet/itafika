import { describe, expect, it } from "vitest";
import { estimateCostKes, rateAppliesToWeight } from "../src/quote.js";

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

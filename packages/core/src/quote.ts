import type { Rate } from "./types.js";

export function estimateCostKes(rate: Pick<Rate, "base_cost_kes" | "cost_per_kg_kes">, weightKg: number): number {
  const raw = rate.base_cost_kes + Math.ceil(weightKg) * rate.cost_per_kg_kes;
  return Math.round(raw / 10) * 10;
}

export function rateAppliesToWeight(rate: Pick<Rate, "max_weight_kg">, weightKg: number): boolean {
  return rate.max_weight_kg === undefined || weightKg <= rate.max_weight_kg;
}

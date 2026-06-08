import type { Provider, QuoteData, QuoteOption, QuoteRequest, Rate } from "./types.js";

const RELIABILITY_FIRST_PACKAGE_TYPES = new Set(["documents", "electronics", "fragile", "medical"]);

function normalizePackageType(packageType: string | undefined): string | null {
  if (typeof packageType !== "string") return null;
  const normalized = packageType.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function compareQuotes(a: QuoteOption, b: QuoteOption, packageType: string | null): number {
  if (packageType !== null && RELIABILITY_FIRST_PACKAGE_TYPES.has(packageType)) {
    return (
      (b.reliability_score ?? 0) - (a.reliability_score ?? 0) ||
      a.estimated_cost_kes - b.estimated_cost_kes
    );
  }

  return (
    a.estimated_cost_kes - b.estimated_cost_kes ||
    (b.reliability_score ?? 0) - (a.reliability_score ?? 0)
  );
}

export function estimateCostKes(rate: Pick<Rate, "base_cost_kes" | "cost_per_kg_kes">, weightKg: number): number {
  const raw = rate.base_cost_kes + Math.ceil(weightKg) * rate.cost_per_kg_kes;
  return Math.round(raw / 10) * 10;
}

export function rateAppliesToWeight(rate: Pick<Rate, "max_weight_kg">, weightKg: number): boolean {
  return rate.max_weight_kg === undefined || weightKg <= rate.max_weight_kg;
}

export function quote(request: QuoteRequest, data: QuoteData): QuoteOption[] {
  const weightKg = request.package_weight_kg;
  const packageType = normalizePackageType(request.package_type);
  const providersById = new Map<string, Provider>(data.providers.map((p) => [p.id, p]));

  const options: QuoteOption[] = [];
  for (const rate of data.rates) {
    if (rate.origin_zone_id !== request.origin_zone_id) continue;
    if (rate.destination_zone_id !== request.destination_zone_id) continue;
    if (!rateAppliesToWeight(rate, weightKg)) continue;

    const provider = providersById.get(rate.provider_id);
    if (!provider) continue;

    options.push({
      provider_type: provider.type,
      provider_name: provider.name,
      estimated_cost_kes: estimateCostKes(rate, weightKg),
      estimated_time: rate.est_time,
      reliability_score: provider.reliability_score,
    });
  }

  options.sort((a, b) => compareQuotes(a, b, packageType));
  return options;
}

import type { DeliveryOption, ProviderType } from "@itafika/core";
import { StaticRateAdapter, aggregateCoverage } from "@itafika/adapters";

import { loadCoverageData } from "./db.js";

export interface OptionsResult {
  origin_zone_id: string;
  destination_town: string;
  options: DeliveryOption[];
}

/**
 * The discovery surface (ADR 0017): which providers serve the shop's origin into the
 * customer's town, in which mode, collected where, from how much. Navigation only —
 * the bookable price comes from POST /v1/quotes. Returns an empty list for an unknown
 * town or a route nobody serves; `provider_id` is never exposed.
 */
export async function listOptions(
  db: D1Database,
  originZoneId: string,
  destinationTown: string,
  mode?: ProviderType,
): Promise<OptionsResult> {
  const { destinationZones, rates, providers } = await loadCoverageData(db, originZoneId, destinationTown);

  const adapters = providers
    .filter((provider) => mode === undefined || provider.type === mode)
    .map((provider) => new StaticRateAdapter({ provider, rates, zones: destinationZones }));

  const aggregated = await aggregateCoverage(adapters, {
    origin_zone_id: originZoneId,
    destination_town: destinationTown,
  });

  const options: DeliveryOption[] = aggregated.map((entry) => {
    const option: DeliveryOption = {
      provider_name: entry.provider_name,
      provider_type: entry.provider_type,
      reliability_score: entry.reliability_score,
      collection_type: entry.collection_type,
      collection_points: entry.collection_points,
    };
    if (entry.from_cost_kes !== undefined) option.from_cost_kes = entry.from_cost_kes;
    return option;
  });

  return { origin_zone_id: originZoneId, destination_town: destinationTown, options };
}

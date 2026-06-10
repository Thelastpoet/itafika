import { randomUUID } from "node:crypto";
import { estimateCostKes, rateAppliesToWeight } from "@itafika/core";
import type { CollectionPoint, Zone } from "@itafika/core";
import type {
  BookingOrder,
  BookingResult,
  CoverageQuery,
  LogisticsProviderInterface,
  ProviderCoverage,
  ProviderQuote,
  StaticAdapterOptions,
} from "./types.js";

export class StaticRateAdapter implements LogisticsProviderInterface {
  readonly info;
  readonly #rates;
  readonly #zonesById: Map<string, Zone>;

  constructor(options: StaticAdapterOptions) {
    this.info = options.provider;
    this.#rates = options.rates.filter((rate) => rate.provider_id === options.provider.id);
    this.#zonesById = new Map((options.zones ?? []).map((zone) => [zone.id, zone]));
  }

  #collectionPoint(zoneId: string): CollectionPoint {
    const zone = this.#zonesById.get(zoneId);
    if (!zone) return { zone_id: zoneId, name: zoneId };
    return { zone_id: zone.id, name: zone.name, town: zone.town };
  }

  async quote(request: Parameters<LogisticsProviderInterface["quote"]>[0]): Promise<ProviderQuote | null> {
    const candidates = this.#rates
      .filter(
        (rate) =>
          rate.origin_zone_id === request.origin_zone_id &&
          rate.destination_zone_id === request.destination_zone_id &&
          rateAppliesToWeight(rate, request.package_weight_kg),
      )
      .map((rate): ProviderQuote => {
        const quote: ProviderQuote = {
          estimated_cost_kes: estimateCostKes(rate, request.package_weight_kg),
          estimated_time: rate.est_time,
          reliability_score: this.info.reliability_score,
          collection_type: rate.collection_type,
        };
        // For office pickup the collection point is the route's destination zone.
        if (rate.collection_type === "office_pickup") {
          quote.collection_point = this.#collectionPoint(rate.destination_zone_id);
        }
        return quote;
      });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.estimated_cost_kes - b.estimated_cost_kes);
    return candidates[0] ?? null;
  }

  async book(_order: BookingOrder): Promise<BookingResult> {
    return {
      provider_ref: `${this.info.id}_${randomUUID().replace(/-/g, "")}`,
      status: "package_picked",
    };
  }

  async coverage(query: CoverageQuery): Promise<ProviderCoverage[]> {
    // Group the routes this provider runs into the town by handover type.
    const byType = new Map<ProviderCoverage["collection_type"], { zones: Set<string>; from: number }>();
    for (const rate of this.#rates) {
      if (rate.origin_zone_id !== query.origin_zone_id) continue;
      if (this.#zonesById.get(rate.destination_zone_id)?.town !== query.destination_town) continue;
      const group = byType.get(rate.collection_type) ?? { zones: new Set<string>(), from: Infinity };
      group.zones.add(rate.destination_zone_id);
      group.from = Math.min(group.from, rate.base_cost_kes);
      byType.set(rate.collection_type, group);
    }

    return [...byType].map(([collection_type, { zones, from }]) => ({
      collection_type,
      collection_points: [...zones].map((zoneId) => this.#collectionPoint(zoneId)),
      from_cost_kes: from,
    }));
  }
}

import { randomUUID } from "node:crypto";
import { estimateCostKes, rateAppliesToWeight } from "@itafika/core";
import type { BookingOrder, BookingResult, LogisticsProviderInterface, ProviderQuote, StaticAdapterOptions } from "./types.js";

export class StaticRateAdapter implements LogisticsProviderInterface {
  readonly info;
  readonly #rates;

  constructor(options: StaticAdapterOptions) {
    this.info = options.provider;
    this.#rates = options.rates.filter((rate) => rate.provider_id === options.provider.id);
  }

  async quote(request: Parameters<LogisticsProviderInterface["quote"]>[0]): Promise<ProviderQuote | null> {
    const candidates = this.#rates
      .filter(
        (rate) =>
          rate.origin_zone_id === request.origin_zone_id &&
          rate.destination_zone_id === request.destination_zone_id &&
          rateAppliesToWeight(rate, request.package_weight_kg),
      )
      .map((rate) => ({
        estimated_cost_kes: estimateCostKes(rate, request.package_weight_kg),
        estimated_time: rate.est_time,
        reliability_score: this.info.reliability_score,
      }));

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
}

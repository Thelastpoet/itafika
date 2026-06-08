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
    const rate = this.#rates.find(
      (candidate) =>
        candidate.origin_zone_id === request.origin_zone_id &&
        candidate.destination_zone_id === request.destination_zone_id &&
        rateAppliesToWeight(candidate, request.package_weight_kg),
    );

    if (!rate) return null;

    return {
      estimated_cost_kes: estimateCostKes(rate, request.package_weight_kg),
      estimated_time: rate.est_time,
      reliability_score: this.info.reliability_score,
    };
  }

  async book(_order: BookingOrder): Promise<BookingResult> {
    return {
      provider_ref: `${this.info.id}_${randomUUID().replace(/-/g, "")}`,
      status: "package_picked",
    };
  }
}

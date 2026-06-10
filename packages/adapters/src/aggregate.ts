import type { CoverageQuery, LogisticsProviderInterface } from "./types.js";
import type { CollectionPoint, CollectionType, ProviderType, QuoteOption, QuoteRequest } from "@itafika/core";

/**
 * A quote option enriched with the id of the provider whose adapter produced it.
 * `provider_id` is internal: the reference Worker persists it so booking can rebuild
 * the originating adapter, but it is never part of the public quote response.
 */
export type AggregatedQuote = QuoteOption & { provider_id: string };

export async function aggregateQuotes(
  providers: readonly LogisticsProviderInterface[],
  request: QuoteRequest,
): Promise<AggregatedQuote[]> {
  const options: AggregatedQuote[] = [];
  const seenProviderIds = new Set<string>();

  for (const provider of providers) {
    if (seenProviderIds.has(provider.info.id)) {
      throw new Error(`duplicate provider adapter: ${provider.info.id}`);
    }
    seenProviderIds.add(provider.info.id);

    try {
      const quote = await provider.quote(request);
      if (quote === null) continue;

      const option: AggregatedQuote = {
        provider_id: provider.info.id,
        provider_type: provider.info.type,
        provider_name: provider.info.name,
        estimated_cost_kes: quote.estimated_cost_kes,
        estimated_time: quote.estimated_time,
        collection_type: quote.collection_type,
      };
      const reliability = quote.reliability_score ?? provider.info.reliability_score;
      if (reliability !== undefined) option.reliability_score = reliability;
      if (quote.collection_point !== undefined) option.collection_point = quote.collection_point;
      options.push(option);
    } catch {
      continue;
    }
  }

  options.sort(
    (a, b) =>
      a.estimated_cost_kes - b.estimated_cost_kes ||
      (b.reliability_score ?? 0) - (a.reliability_score ?? 0),
  );

  return options;
}

/**
 * A discovery option enriched with the originating provider. `provider_id` is
 * internal (not exposed by /v1/options).
 */
export interface AggregatedCoverage {
  provider_id: string;
  provider_type: ProviderType;
  provider_name: string;
  reliability_score?: number;
  collection_type: CollectionType;
  collection_points: CollectionPoint[];
  from_cost_kes?: number;
}

/**
 * Asks every adapter that implements `coverage()` what it serves into the town
 * (ADR 0017). Adapters without it simply don't appear. Sorted cheapest-first, then
 * most reliable — the same default ranking as quotes; entries without a from-cost
 * sort last.
 */
export async function aggregateCoverage(
  providers: readonly LogisticsProviderInterface[],
  query: CoverageQuery,
): Promise<AggregatedCoverage[]> {
  const options: AggregatedCoverage[] = [];
  const seenProviderIds = new Set<string>();

  for (const provider of providers) {
    if (seenProviderIds.has(provider.info.id)) {
      throw new Error(`duplicate provider adapter: ${provider.info.id}`);
    }
    seenProviderIds.add(provider.info.id);

    if (!provider.coverage) continue;
    try {
      for (const entry of await provider.coverage(query)) {
        if (entry.collection_points.length === 0) continue;
        const option: AggregatedCoverage = {
          provider_id: provider.info.id,
          provider_type: provider.info.type,
          provider_name: provider.info.name,
          collection_type: entry.collection_type,
          collection_points: entry.collection_points,
        };
        if (provider.info.reliability_score !== undefined) option.reliability_score = provider.info.reliability_score;
        if (entry.from_cost_kes !== undefined) option.from_cost_kes = entry.from_cost_kes;
        options.push(option);
      }
    } catch {
      continue;
    }
  }

  options.sort(
    (a, b) =>
      (a.from_cost_kes ?? Infinity) - (b.from_cost_kes ?? Infinity) ||
      (b.reliability_score ?? 0) - (a.reliability_score ?? 0),
  );
  return options;
}

import type { LogisticsProviderInterface } from "./types.js";
import type { QuoteOption, QuoteRequest } from "@itafika/core";

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

      options.push({
        provider_id: provider.info.id,
        provider_type: provider.info.type,
        provider_name: provider.info.name,
        estimated_cost_kes: quote.estimated_cost_kes,
        estimated_time: quote.estimated_time,
        reliability_score: quote.reliability_score ?? provider.info.reliability_score,
      });
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

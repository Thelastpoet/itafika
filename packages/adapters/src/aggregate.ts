import type { LogisticsProviderInterface } from "./types.js";
import type { QuoteOption, QuoteRequest } from "@itafika/core";

export async function aggregateQuotes(
  providers: readonly LogisticsProviderInterface[],
  request: QuoteRequest,
): Promise<QuoteOption[]> {
  const options: QuoteOption[] = [];
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

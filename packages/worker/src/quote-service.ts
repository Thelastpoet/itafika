import type { Quote, QuoteRequest } from "@itafika/core";
import { StaticRateAdapter, aggregateQuotes } from "@itafika/adapters";

import { loadQuoteData, persistQuotes, pruneExpiredQuotes, zonesExist } from "./db.js";
import { createQuoteId, quoteExpiresAt } from "./policy.js";

/**
 * A persisted quote keeps its originating provider_id alongside the public Quote.
 * provider_id is internal — booking uses it to rebuild the adapter, but it is never
 * returned in the quote response.
 */
export interface PersistableQuote {
  quote: Quote;
  provider_id: string;
}

export async function createQuotes(
  db: D1Database,
  request: QuoteRequest,
): Promise<
  | { ok: true; body: { origin_zone_id: string; destination_zone_id: string; quotes: Quote[] } }
  | { ok: false; code: "not_found" }
> {
  const { origin_zone_id, destination_zone_id, package_weight_kg } = request;
  if (!(await zonesExist(db, origin_zone_id, destination_zone_id))) {
    return { ok: false, code: "not_found" };
  }

  const now = new Date().toISOString();
  await pruneExpiredQuotes(db, now);

  const data = await loadQuoteData(db, origin_zone_id, destination_zone_id);
  const providers = data.providers.map((provider) => new StaticRateAdapter({ provider, rates: data.rates }));

  const persistable: PersistableQuote[] = (await aggregateQuotes(providers, request)).map((option) => {
    const { provider_id, ...quoteOption } = option;
    return { quote: { quote_id: createQuoteId(), ...quoteOption }, provider_id };
  });

  await persistQuotes(
    db,
    persistable,
    origin_zone_id,
    destination_zone_id,
    package_weight_kg,
    now,
    quoteExpiresAt(now),
  );

  return {
    ok: true,
    body: { origin_zone_id, destination_zone_id, quotes: persistable.map((p) => p.quote) },
  };
}

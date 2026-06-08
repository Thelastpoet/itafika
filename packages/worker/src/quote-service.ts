import { quote } from "@itafika/core";
import type { Quote, QuoteOption, QuoteRequest } from "@itafika/core";

import { loadQuoteData, persistQuotes, pruneExpiredQuotes, zonesExist } from "./db.js";
import { createQuoteId, quoteExpiresAt } from "./policy.js";

function withQuoteId(option: QuoteOption): Quote {
  return { quote_id: createQuoteId(), ...option };
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
  const quotes = quote({ origin_zone_id, destination_zone_id, package_weight_kg }, data).map(withQuoteId);

  await persistQuotes(
    db,
    quotes,
    origin_zone_id,
    destination_zone_id,
    package_weight_kg,
    now,
    quoteExpiresAt(now),
  );

  return { ok: true, body: { origin_zone_id, destination_zone_id, quotes } };
}

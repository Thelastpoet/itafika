import type { Delivery, DeliveryRequest, Provider } from "@itafika/core";
import { StaticRateAdapter } from "@itafika/adapters";

import { getBookableQuote, pruneExpiredQuotes, recordDelivery } from "./db.js";
import { createTrackingId } from "./policy.js";

export async function bookDelivery(db: D1Database, request: DeliveryRequest): Promise<Delivery | null> {
  const now = new Date().toISOString();
  await pruneExpiredQuotes(db, now);

  const quoteRow = await getBookableQuote(db, request.quote_id, now);
  if (!quoteRow || quoteRow.provider_id === null) return null;

  // Rebuild the adapter for the provider that produced this quote and book through it.
  // The static adapter's book() needs only ProviderInfo; rates are irrelevant to booking.
  const provider: Provider = {
    id: quoteRow.provider_id,
    name: quoteRow.provider_name,
    type: quoteRow.provider_type,
  };
  if (quoteRow.reliability_score !== null) provider.reliability_score = quoteRow.reliability_score;
  const adapter = new StaticRateAdapter({ provider, rates: [] });

  const booking = await adapter.book({
    quote_id: request.quote_id,
    origin_zone_id: quoteRow.origin_zone_id,
    destination_zone_id: quoteRow.destination_zone_id,
    sender: request.sender,
    recipient: request.recipient,
    package_description: request.package_description,
    instructions: request.instructions,
    alternate_collector: request.alternate_collector,
  });

  return recordDelivery(db, {
    trackingId: createTrackingId(),
    quoteRow,
    req: request,
    status: booking.status,
    providerRef: booking.provider_ref,
    now,
  });
}

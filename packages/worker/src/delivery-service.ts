import type { Delivery, Provider } from "@itafika/core";
import { StaticRateAdapter } from "@itafika/adapters";

import {
  appendDeliveryTransition,
  createProviderBookingTask,
  getBookableQuote,
  hasActiveProviderAccount,
  recordDeliveryBooking,
  pruneExpiredQuotes,
  setDeliveryProviderRef,
  type DeliveryBookingRequest,
} from "./db.js";
import { addHours, createProviderBookingTaskId, createTrackingId } from "./policy.js";

export async function bookDelivery(db: D1Database, request: DeliveryBookingRequest): Promise<Delivery | null> {
  const now = new Date().toISOString();
  await pruneExpiredQuotes(db, now);
  const quoteRow = await getBookableQuote(db, request.quote_id, now);
  if (!quoteRow || quoteRow.provider_id === null) return null;

  const delivery = await recordDeliveryBooking(db, {
    trackingId: createTrackingId(),
    quoteRow,
    request,
    now,
  });
  if (!delivery) return null;

  if (await hasActiveProviderAccount(db, quoteRow.provider_id)) {
    await createProviderBookingTask(db, {
      id: createProviderBookingTaskId(),
      trackingId: delivery.tracking_id,
      providerId: quoteRow.provider_id,
      createdAt: now,
      expiresAt: addHours(now, 24),
    });
    return delivery;
  }

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
    shop_order_ref: request.shop_order_ref,
    shop_handoff_url: request.shop_handoff_url,
  });

  await setDeliveryProviderRef(db, delivery.tracking_id, booking.provider_ref);
  await appendDeliveryTransition(db, delivery.tracking_id, "booking_confirmed", now, "adapter");
  await appendDeliveryTransition(db, delivery.tracking_id, "package_picked", now, "adapter");

  return delivery;
}

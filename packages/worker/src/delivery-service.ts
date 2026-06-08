import type { Delivery, DeliveryRequest } from "@itafika/core";

import { createDelivery, pruneExpiredQuotes } from "./db.js";
import { createTrackingId } from "./policy.js";

export async function bookDelivery(db: D1Database, request: DeliveryRequest): Promise<Delivery | null> {
  const now = new Date().toISOString();
  await pruneExpiredQuotes(db, now);
  return createDelivery(db, request, now, createTrackingId());
}

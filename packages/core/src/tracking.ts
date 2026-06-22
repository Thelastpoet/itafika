import type { TrackingEvent, TrackingStatus } from "./types.js";

export const TRACKING_STATUS_FLOW = [
  "booking_requested",
  "booking_confirmed",
  "package_picked",
  "in_transit",
  "at_sorting_hub",
  "ready_for_pickup",
  "delivered",
  "delivery_cancelled",
] as const satisfies readonly TrackingStatus[];

const allowedNextStatuses: Record<TrackingStatus, readonly TrackingStatus[]> = {
  booking_requested: ["booking_confirmed", "delivery_cancelled"],
  booking_confirmed: [
    "package_picked",
    "in_transit",
    "at_sorting_hub",
    "ready_for_pickup",
    "delivered",
    "delivery_cancelled",
  ],
  package_picked: ["in_transit"],
  in_transit: ["at_sorting_hub"],
  at_sorting_hub: ["ready_for_pickup"],
  ready_for_pickup: ["delivered"],
  delivered: [],
  delivery_cancelled: [],
};

export function latestTrackingStatus(history: readonly Pick<TrackingEvent, "status">[]): TrackingStatus | null {
  return history.length === 0 ? null : history[history.length - 1]!.status;
}

export function canAdvanceTrackingStatus(
  current: TrackingStatus,
  next: TrackingStatus,
): boolean {
  return allowedNextStatuses[current].includes(next);
}

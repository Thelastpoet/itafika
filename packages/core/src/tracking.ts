import type { TrackingEvent, TrackingStatus } from "./types.js";

export const TRACKING_STATUS_FLOW = [
  "package_picked",
  "in_transit",
  "at_sorting_hub",
  "ready_for_pickup",
  "delivered",
] as const satisfies readonly TrackingStatus[];

const trackingStatusIndex = new Map<TrackingStatus, number>(
  TRACKING_STATUS_FLOW.map((status, index) => [status, index]),
);

export function latestTrackingStatus(history: readonly Pick<TrackingEvent, "status">[]): TrackingStatus | null {
  return history.length === 0 ? null : history[history.length - 1]!.status;
}

export function canAdvanceTrackingStatus(
  current: TrackingStatus,
  next: TrackingStatus,
): boolean {
  return (trackingStatusIndex.get(next) ?? -1) >= (trackingStatusIndex.get(current) ?? -1);
}

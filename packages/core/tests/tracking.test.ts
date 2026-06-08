import { describe, expect, it } from "vitest";

import { TRACKING_STATUS_FLOW, canAdvanceTrackingStatus, latestTrackingStatus } from "../src/index.js";

describe("tracking lifecycle helpers", () => {
  it("exposes the universal status order", () => {
    expect(TRACKING_STATUS_FLOW).toEqual([
      "package_picked",
      "in_transit",
      "at_sorting_hub",
      "ready_for_pickup",
      "delivered",
    ]);
  });

  it("returns the latest status from tracking history", () => {
    expect(
      latestTrackingStatus([
        { status: "package_picked", at: "2026-06-08T08:00:00.000Z" },
        { status: "in_transit", at: "2026-06-08T08:10:00.000Z" },
      ]),
    ).toBe("in_transit");
  });

  it("allows forward movement and rejects regression", () => {
    expect(canAdvanceTrackingStatus("package_picked", "in_transit")).toBe(true);
    expect(canAdvanceTrackingStatus("delivered", "ready_for_pickup")).toBe(false);
  });
});

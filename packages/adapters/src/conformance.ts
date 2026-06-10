import { describe, expect, it } from "vitest";

import type { BookingOrder, LogisticsProviderInterface } from "./types.js";
import type { QuoteRequest, TrackingStatus } from "@itafika/core";

/**
 * Reusable conformance suite for any `LogisticsProviderInterface` implementation.
 *
 * This is the suite the adapter contract refers to ("Pass the adapter conformance
 * tests"). An adapter author calls `describeAdapterConformance(...)` from a `*.test.ts`
 * and gets the contract's correctness rules checked for free:
 *
 * - `quote()` returns `null` for routes the provider does not serve
 * - a served `quote()` has an integer KES cost and a non-empty human-readable time
 * - `book()` returns a non-empty provider ref and one of the five universal statuses
 * - `track()`, when implemented, also maps only to a universal status
 * - `ProviderInfo` is well-formed; `reliability_score`, when asserted, is in [0, 1] (ADR 0021)
 *
 * Imported from `@itafika/adapters/conformance` (kept off the main barrel so the
 * vitest dependency never reaches production code).
 */

export const UNIVERSAL_TRACKING_STATUSES: readonly TrackingStatus[] = [
  "package_picked",
  "in_transit",
  "at_sorting_hub",
  "ready_for_pickup",
  "delivered",
];

export interface AdapterConformanceOptions {
  /** Builds a fresh adapter instance for each assertion, so tests never share state. */
  makeAdapter: () => LogisticsProviderInterface;
  /** A request the adapter is expected to serve — `quote()` must return non-null. */
  servedRequest: QuoteRequest;
  /** A request the adapter must NOT serve — `quote()` must return null, not a guess. */
  unservedRequest: QuoteRequest;
  /** A booking order for the served route, used to exercise `book()` / `track()`. */
  bookingOrder: BookingOrder;
}

export function describeAdapterConformance(label: string, options: AdapterConformanceOptions): void {
  const { makeAdapter, servedRequest, unservedRequest, bookingOrder } = options;

  describe(`adapter conformance: ${label}`, () => {
    it("declares a well-formed ProviderInfo", () => {
      const { info } = makeAdapter();
      expect(typeof info.id).toBe("string");
      expect(info.id.length).toBeGreaterThan(0);
      expect(typeof info.name).toBe("string");
      expect(info.name.length).toBeGreaterThan(0);
      // type is an open mode id from the registry (ADR 0019), not a closed enum.
      expect(typeof info.type).toBe("string");
      expect(info.type.length).toBeGreaterThan(0);
      // reliability_score is asserted, not measured; omitting it is conformant (ADR 0021).
      if (info.reliability_score !== undefined) {
        expect(info.reliability_score).toBeGreaterThanOrEqual(0);
        expect(info.reliability_score).toBeLessThanOrEqual(1);
      }
    });

    it("quote() returns a well-formed quote for a served route", async () => {
      const quote = await makeAdapter().quote(servedRequest);
      expect(quote).not.toBeNull();
      if (quote === null) return;

      expect(Number.isInteger(quote.estimated_cost_kes)).toBe(true);
      expect(quote.estimated_cost_kes).toBeGreaterThanOrEqual(0);
      expect(typeof quote.estimated_time).toBe("string");
      expect(quote.estimated_time.length).toBeGreaterThan(0);
      // A conformant adapter declares how the parcel is handed over (ADR 0016).
      expect(["office_pickup", "door_delivery"]).toContain(quote.collection_type);
      if (quote.reliability_score !== undefined) {
        expect(quote.reliability_score).toBeGreaterThanOrEqual(0);
        expect(quote.reliability_score).toBeLessThanOrEqual(1);
      }
    });

    it("quote() returns null for an unserved route (no misleading price)", async () => {
      await expect(makeAdapter().quote(unservedRequest)).resolves.toBeNull();
    });

    it("book() returns a non-empty provider_ref and a universal status", async () => {
      const result = await makeAdapter().book(bookingOrder);
      expect(typeof result.provider_ref).toBe("string");
      expect(result.provider_ref.length).toBeGreaterThan(0);
      expect(UNIVERSAL_TRACKING_STATUSES).toContain(result.status);
    });

    it("track(), when implemented, maps only to a universal status", async () => {
      const adapter = makeAdapter();
      if (!adapter.track) return; // optional in Phase 1

      const booking = await adapter.book(bookingOrder);
      const status = await adapter.track(booking.provider_ref);
      expect(UNIVERSAL_TRACKING_STATUSES).toContain(status);
    });
  });
}

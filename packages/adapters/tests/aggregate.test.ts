import { describe, expect, it } from "vitest";

import { aggregateQuotes } from "../src/aggregate.js";
import type { LogisticsProviderInterface } from "../src/types.js";

function provider(
  id: string,
  overrides: Partial<LogisticsProviderInterface> & {
    info?: LogisticsProviderInterface["info"];
  } = {},
): LogisticsProviderInterface {
  return {
    info: overrides.info ?? {
      id,
      name: id,
      type: "matatu_sacco",
      reliability_score: 0.9,
    },
    quote: overrides.quote ?? (async () => null),
    book: overrides.book ?? (async () => ({ provider_ref: `${id}_ref`, status: "package_picked" })),
    track: overrides.track,
  };
}

describe("aggregateQuotes", () => {
  const request = {
    origin_zone_id: "ZONE_NBI_CBD_01",
    destination_zone_id: "ZONE_ELD_MAIN",
    package_weight_kg: 2.5,
  } as const;

  it("skips providers that do not serve the route", async () => {
    const results = await aggregateQuotes([provider("null-route")], request);
    expect(results).toEqual([]);
  });

  it("isolates provider failures and still returns other quotes", async () => {
    const results = await aggregateQuotes(
      [
        provider("broken", { quote: async () => {
          throw new Error("boom");
        } }),
        provider("working", {
          info: { id: "working", name: "Working Sacco", type: "matatu_sacco", reliability_score: 0.98 },
          quote: async () => ({
            estimated_cost_kes: 560,
            estimated_time: "5 hours",
          }),
        }),
      ],
      request,
    );

    expect(results).toEqual([
      {
        provider_id: "working",
        provider_type: "matatu_sacco",
        provider_name: "Working Sacco",
        estimated_cost_kes: 560,
        estimated_time: "5 hours",
        reliability_score: 0.98,
      },
    ]);
  });

  it("sorts cheapest first, then reliability descending", async () => {
    const results = await aggregateQuotes(
      [
        provider("g4s", {
          info: { id: "g4s", name: "G4S Courier", type: "national_courier", reliability_score: 0.99 },
          quote: async () => ({
            estimated_cost_kes: 560,
            estimated_time: "next day",
          }),
        }),
        provider("mololine", {
          info: { id: "mololine", name: "Mololine Sacco", type: "matatu_sacco", reliability_score: 0.98 },
          quote: async () => ({
            estimated_cost_kes: 560,
            estimated_time: "5 hours",
          }),
        }),
        provider("2nk", {
          info: { id: "2nk", name: "2NK Sacco", type: "matatu_sacco", reliability_score: 0.97 },
          quote: async () => ({
            estimated_cost_kes: 400,
            estimated_time: "3 hours",
          }),
        }),
      ],
      request,
    );

    expect(results.map((result) => result.provider_name)).toEqual([
      "2NK Sacco",
      "G4S Courier",
      "Mololine Sacco",
    ]);
  });

  it("carries each option's originating provider_id", async () => {
    const results = await aggregateQuotes(
      [
        provider("g4s", {
          info: { id: "g4s", name: "G4S Courier", type: "national_courier", reliability_score: 0.99 },
          quote: async () => ({ estimated_cost_kes: 770, estimated_time: "next day" }),
        }),
        provider("mololine", {
          info: { id: "mololine", name: "Mololine Sacco", type: "matatu_sacco", reliability_score: 0.98 },
          quote: async () => ({ estimated_cost_kes: 400, estimated_time: "3 hours" }),
        }),
      ],
      request,
    );

    expect(results.map((result) => [result.provider_id, result.provider_name])).toEqual([
      ["mololine", "Mololine Sacco"],
      ["g4s", "G4S Courier"],
    ]);
  });

  it("asserts a single adapter per provider id", async () => {
    await expect(
      aggregateQuotes(
        [
          provider("mololine", {
            info: { id: "mololine", name: "Mololine Sacco", type: "matatu_sacco", reliability_score: 0.98 },
          }),
          provider("mololine", {
            info: { id: "mololine", name: "Mololine Duplicate", type: "matatu_sacco", reliability_score: 0.98 },
          }),
        ],
        request,
      ),
    ).rejects.toThrow("duplicate provider adapter: mololine");
  });
});

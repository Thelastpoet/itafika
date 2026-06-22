import { describeAdapterConformance } from "../src/conformance.js";
import { StaticRateAdapter } from "../src/index.js";

const provider = {
  id: "mololine",
  name: "Mololine Sacco",
  type: "matatu_sacco" as const,
  reliability_score: 0.98,
};

const rates = [
  {
    provider_id: "mololine",
    origin_zone_id: "ZONE_NBI_CBD_01",
    destination_zone_id: "ZONE_NKR_MAIN",
    base_cost_kes: 400,
    cost_per_kg_kes: 20,
    est_time: "3 hours",
    max_weight_kg: 20,
    collection_type: "office_pickup" as const,
    source: "test",
  },
];

// The reference static adapter must itself pass the contract it documents.
describeAdapterConformance("StaticRateAdapter", {
  makeAdapter: () => new StaticRateAdapter({ provider, rates }),
  servedRequest: {
    origin_zone_id: "ZONE_NBI_CBD_01",
    destination_zone_id: "ZONE_NKR_MAIN",
    package_weight_kg: 2.5,
  },
  unservedRequest: {
    origin_zone_id: "ZONE_NBI_CBD_01",
    destination_zone_id: "ZONE_NOWHERE",
    package_weight_kg: 2.5,
  },
  bookingOrder: {
    quote_id: "qt_b1a56ce02d7345f398ee2c04",
    origin_zone_id: "ZONE_NBI_CBD_01",
    destination_zone_id: "ZONE_NKR_MAIN",
    shop_order_ref: "ORDER-12345",
    shop_handoff_url: "https://shop.example.com/delivery-handoff/ORDER-12345",
  },
});

import type { components } from "./types.gen.js";

export type ZoneType = components["schemas"]["ZoneType"];
export type ProviderType = components["schemas"]["ProviderType"];
export type Coordinates = components["schemas"]["Coordinates"];
export type Zone = components["schemas"]["Zone"];
export type QuoteRequest = components["schemas"]["QuoteRequest"];
export type Quote = components["schemas"]["Quote"];

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  reliability_score: number;
}

export interface Rate {
  provider_id: string;
  origin_zone_id: string;
  destination_zone_id: string;
  base_cost_kes: number;
  cost_per_kg_kes: number;
  est_time: string;
  max_weight_kg?: number;
  source: string;
}

export type QuoteOption = Omit<Quote, "quote_id">;

export interface QuoteData {
  rates: readonly Rate[];
  providers: readonly Provider[];
}

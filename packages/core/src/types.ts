import type { components } from "./types.gen.js";

export type ZoneType = components["schemas"]["ZoneType"];
export type ProviderType = components["schemas"]["ProviderType"];
export type Mode = components["schemas"]["Mode"];
export type CollectionType = components["schemas"]["CollectionType"];
export type CollectionPoint = components["schemas"]["CollectionPoint"];
export type DeliveryOption = components["schemas"]["DeliveryOption"];
export type Coordinates = components["schemas"]["Coordinates"];
export type Zone = components["schemas"]["Zone"];
export type FreshnessEntry = components["schemas"]["FreshnessEntry"];
export type QuoteRequest = components["schemas"]["QuoteRequest"];
export type Quote = components["schemas"]["Quote"];
export type Contact = components["schemas"]["Contact"];
export type DeliveryRequest = components["schemas"]["DeliveryRequest"];
export type Delivery = components["schemas"]["Delivery"];
export type TrackingStatus = components["schemas"]["TrackingStatus"];
export type TrackingEvent = components["schemas"]["TrackingEvent"];
export type TrackingEventCreateRequest = components["schemas"]["TrackingEventCreateRequest"];
export type TrackingResponse = components["schemas"]["TrackingResponse"];

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  /** Asserted, not measured; omit when there is no basis for a value (ADR 0021). */
  reliability_score?: number;
}

export interface Rate {
  provider_id: string;
  origin_zone_id: string;
  destination_zone_id: string;
  base_cost_kes: number;
  cost_per_kg_kes: number;
  est_time: string;
  max_weight_kg?: number;
  collection_type: CollectionType;
  source: string;
}

export type QuoteOption = Omit<Quote, "quote_id">;

export interface QuoteData {
  rates: readonly Rate[];
  providers: readonly Provider[];
}

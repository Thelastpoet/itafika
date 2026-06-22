import type {
  CollectionPoint,
  CollectionType,
  Provider,
  ProviderType,
  QuoteOption,
  QuoteRequest,
  Rate,
  TrackingStatus,
  Zone,
} from "@itafika/core";

export type ProviderInfo = Provider;

/**
 * A provider's quote for a route. `collection_type` is required — a conformant
 * adapter must declare how its provider hands the parcel over (ADR 0016).
 * `collection_point` is optional: for office pickup it is the place the recipient
 * collects, which a live provider may declare specifically (its named office). An
 * adapter that omits it for an office pickup lets the consumer fall back to the
 * route's destination zone.
 */
export type ProviderQuote = Pick<
  QuoteOption,
  "estimated_cost_kes" | "estimated_time" | "reliability_score" | "collection_type" | "collection_point"
>;

export interface BookingOrder {
  quote_id: string;
  origin_zone_id: string;
  destination_zone_id: string;
  shop_order_ref: string;
  shop_handoff_url?: string;
}

export interface BookingResult {
  provider_ref: string;
  status: TrackingStatus;
}

/**
 * Asks an adapter what it serves into a destination town, for the discovery surface
 * (ADR 0017). Navigation, not pricing — no weight, no bookable cost. The adapter
 * answers from its own knowledge of the town.
 */
export interface CoverageQuery {
  origin_zone_id: string;
  destination_town: string;
}

/**
 * One way the provider serves the town: a handover type, the named collection points
 * it serves with that handover, and an indicative starting cost. A provider that
 * offers both office pickup and door delivery returns one entry per handover type.
 */
export interface ProviderCoverage {
  collection_type: CollectionType;
  collection_points: CollectionPoint[];
  from_cost_kes?: number;
}

export interface LogisticsProviderInterface {
  readonly info: ProviderInfo;
  quote(request: QuoteRequest): Promise<ProviderQuote | null>;
  book(order: BookingOrder): Promise<BookingResult>;
  track?(providerRef: string): Promise<TrackingStatus>;
  /** Optional discovery (ADR 0017). Adapters that don't implement it don't appear in /v1/options. */
  coverage?(query: CoverageQuery): Promise<ProviderCoverage[]>;
}

export interface StaticAdapterOptions {
  provider: ProviderInfo;
  rates: readonly Rate[];
  /** Zones the adapter may reference, e.g. to name collection points. Optional. */
  zones?: readonly Zone[];
}

export type { ProviderType };

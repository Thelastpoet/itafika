import type { Contact, Provider, ProviderType, QuoteRequest, Rate, TrackingStatus } from "@itafika/core";

export interface ProviderInfo extends Provider {}

export interface ProviderQuote {
  estimated_cost_kes: number;
  estimated_time: string;
  reliability_score?: number;
}

export interface BookingOrder {
  quote_id: string;
  origin_zone_id: string;
  destination_zone_id: string;
  sender: Contact;
  recipient: Contact;
  package_description?: string;
}

export interface BookingResult {
  provider_ref: string;
  status: TrackingStatus;
}

export interface LogisticsProviderInterface {
  readonly info: ProviderInfo;
  quote(request: QuoteRequest): Promise<ProviderQuote | null>;
  book(order: BookingOrder): Promise<BookingResult>;
  track?(providerRef: string): Promise<TrackingStatus>;
}

export interface StaticAdapterOptions {
  provider: ProviderInfo;
  rates: readonly Rate[];
}

export type { ProviderType };

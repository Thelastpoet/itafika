import type {
  ChangeLogEntry,
  Delivery,
  ProviderAccount,
  ProviderBookingDetail,
  ProviderBookingEventRequest,
  ProviderBookingStatus,
  ProviderBookingSummary,
  ProviderMeResponse,
  ProviderSubmissionRequest,
  ReferenceExport,
  Submission,
  SubmissionCreateRequest,
  SubmissionDetail,
  SubmissionOperation,
  SubmissionStatus,
  SubmissionTarget,
  TrackingStatus,
} from "@itafika/core";

export type {
  ChangeLogEntry,
  Delivery,
  ProviderAccount,
  ProviderBookingDetail,
  ProviderBookingEventRequest,
  ProviderBookingStatus,
  ProviderBookingSummary,
  ProviderMeResponse,
  ProviderSubmissionRequest,
  ReferenceExport,
  Submission,
  SubmissionCreateRequest,
  SubmissionDetail,
  SubmissionOperation,
  SubmissionStatus,
  SubmissionTarget,
  TrackingStatus,
};

export interface ReferenceLookupProvider {
  id: string;
  name: string;
  type: string;
}

export interface ReferenceLookupZone {
  id: string;
  name: string;
  town: string;
  type: string;
}

export interface ReferenceLookupMode {
  id: string;
  label: string;
  description?: string;
}

export interface ReferenceLookupFreshness {
  town: string;
  last_updated: string;
}

export interface ReferenceLookups {
  providers: ReferenceLookupProvider[];
  zones: ReferenceLookupZone[];
  modes: ReferenceLookupMode[];
}

export function coerceReferenceRows<T>(rows: readonly unknown[] | undefined): T[] {
  return (rows ?? []) as unknown as T[];
}

export interface PortalContext {
  reference: ReferenceExport | null;
  lookups: ReferenceLookups;
  contributorName: string;
  moderatorToken: string;
  providerToken: string;
  setContributorName: (name: string) => void;
  setModeratorToken: (token: string) => void;
  setProviderToken: (token: string) => void;
  navigate: (path: string) => void;
}

export interface RouteProps {
  context: PortalContext;
  params: Record<string, string>;
}

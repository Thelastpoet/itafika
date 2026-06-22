export const QUOTE_ID_RE = /^qt_[a-f0-9]{24}$/;
export const TRACKING_ID_RE = /^trk_[a-f0-9]{32}$/;
export const PROVIDER_ACCOUNT_ID_RE = /^pa_[a-f0-9]{24}$/;
export const PROVIDER_BOOKING_TASK_ID_RE = /^pbt_[a-f0-9]{24}$/;

export const QUOTE_TTL_HOURS = 24;

function opaqueId(prefix: string, hexLength: number): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, hexLength)}`;
}

export function createQuoteId(): string {
  return opaqueId("qt", 24);
}

export function createTrackingId(): string {
  return opaqueId("trk", 32);
}

export function createSubmissionId(): string {
  return opaqueId("sub", 24);
}

export function createProviderAccountId(): string {
  return opaqueId("pa", 24);
}

export function createProviderBookingTaskId(): string {
  return opaqueId("pbt", 24);
}

export function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 60 * 60 * 1000).toISOString();
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 24 * 60 * 60 * 1000).toISOString();
}

export function quoteExpiresAt(createdAt: string): string {
  return addHours(createdAt, QUOTE_TTL_HOURS);
}

export function safeUtcTimestampKey(iso: string): string {
  return new Date(iso).toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
}

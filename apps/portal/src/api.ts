import type {
  ChangeLogEntry,
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
  SubmissionStatus,
  SubmissionTarget,
} from "@itafika/core";

type QueryValue = string | number | boolean | null | undefined;

export interface SubmissionFilters {
  status?: SubmissionStatus;
  target?: SubmissionTarget;
}

export interface ChangeLogFilters {
  target?: SubmissionTarget;
  row_key?: string;
  limit?: number;
}

export interface ProviderBookingFilters {
  status?: ProviderBookingStatus;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query.length ? `?${query}` : "";
}

export function buildAuthorizedInit(token: string, init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers ?? {});
  headers.set("authorization", `Bearer ${token}`);
  if (!headers.has("content-type") && init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  return { ...init, headers };
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  return readJson<T>(response);
}

export function getReferenceExport(): Promise<ReferenceExport> {
  return fetchJson<ReferenceExport>("/v1/export");
}

export function createSubmission(input: SubmissionCreateRequest): Promise<Submission> {
  return fetchJson<Submission>("/v1/submissions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function listSubmissions(token: string, filters: SubmissionFilters = {}): Promise<{ submissions: Submission[] }> {
  return fetchJson<{ submissions: Submission[] }>(
    `/v1/submissions${buildQuery({ status: filters.status, target: filters.target })}`,
    buildAuthorizedInit(token),
  );
}

export function getSubmission(token: string, id: string): Promise<SubmissionDetail> {
  return fetchJson<SubmissionDetail>(`/v1/submissions/${encodeURIComponent(id)}`, buildAuthorizedInit(token));
}

export function approveSubmission(token: string, id: string, note?: string): Promise<Submission> {
  return fetchJson<Submission>(`/v1/submissions/${encodeURIComponent(id)}/approve`, buildAuthorizedInit(token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(note ? { note } : {}),
  }));
}

export function rejectSubmission(token: string, id: string, note: string): Promise<Submission> {
  return fetchJson<Submission>(`/v1/submissions/${encodeURIComponent(id)}/reject`, buildAuthorizedInit(token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ note }),
  }));
}

export function listChangeLog(token: string, filters: ChangeLogFilters = {}): Promise<{ changes: ChangeLogEntry[] }> {
  return fetchJson<{ changes: ChangeLogEntry[] }>(
    `/v1/change-log${buildQuery({ target: filters.target, row_key: filters.row_key, limit: filters.limit })}`,
    buildAuthorizedInit(token),
  );
}

export function providerMe(token: string): Promise<ProviderMeResponse> {
  return fetchJson<ProviderMeResponse>("/v1/provider/me", buildAuthorizedInit(token));
}

export function providerCreateSubmission(token: string, input: ProviderSubmissionRequest): Promise<Submission> {
  return fetchJson<Submission>("/v1/provider/submissions", buildAuthorizedInit(token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }));
}

export function providerListBookings(
  token: string,
  filters: ProviderBookingFilters = {},
): Promise<{ bookings: ProviderBookingSummary[] }> {
  return fetchJson<{ bookings: ProviderBookingSummary[] }>(
    `/v1/provider/bookings${buildQuery({ status: filters.status })}`,
    buildAuthorizedInit(token),
  );
}

export function providerGetBooking(token: string, id: string): Promise<ProviderBookingDetail> {
  return fetchJson<ProviderBookingDetail>(`/v1/provider/bookings/${encodeURIComponent(id)}`, buildAuthorizedInit(token));
}

export function providerAcceptBooking(token: string, id: string): Promise<ProviderBookingDetail> {
  return fetchJson<ProviderBookingDetail>(
    `/v1/provider/bookings/${encodeURIComponent(id)}/accept`,
    buildAuthorizedInit(token, { method: "POST" }),
  );
}

export function providerRejectBooking(token: string, id: string, note: string): Promise<ProviderBookingDetail> {
  return fetchJson<ProviderBookingDetail>(
    `/v1/provider/bookings/${encodeURIComponent(id)}/reject`,
    buildAuthorizedInit(token, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note }),
    }),
  );
}

export function providerAppendTrackingEvent(
  token: string,
  id: string,
  input: ProviderBookingEventRequest,
): Promise<ProviderBookingDetail> {
  return fetchJson<ProviderBookingDetail>(
    `/v1/provider/bookings/${encodeURIComponent(id)}/events`,
    buildAuthorizedInit(token, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

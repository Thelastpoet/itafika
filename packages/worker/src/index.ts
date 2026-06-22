import type { ProviderType, QuoteRequest, ZoneType } from "@itafika/core";
import {
  appendTrackingEvent,
  listFreshness,
  listModes,
  listZones,
  trackDelivery,
  searchZones,
} from "./db.js";
import { bookDelivery } from "./delivery-service.js";
import {
  clampLimit,
  isQuoteId,
  isTrackingId,
  parseContact,
  parseInstructions,
  parsePackageDescription,
  parseShopHandoffUrl,
  parseShopOrderRef,
  parseTrackingNote,
} from "./validation.js";
import { createQuotes } from "./quote-service.js";
import { listOptions } from "./options-service.js";
import { authenticateModerator } from "./auth.js";
import {
  exportReferenceData,
  readReferenceExportSnapshot,
  referenceExportArchiveKey,
  writeReferenceExportSnapshot,
} from "./export-service.js";
import { runDailyMaintenance } from "./maintenance.js";
import {
  approveSubmission,
  createSubmission,
  getChangeLog,
  getSubmissionDetails,
  listSubmissions,
  rejectSubmission,
  type SubmissionInput,
  type SubmissionStatus,
  type SubmissionTarget,
} from "./moderation.js";
import { authenticateProvider } from "./provider-auth.js";
import { safeUtcTimestampKey } from "./policy.js";
import {
  acceptProviderBooking,
  appendProviderBookingEvent,
  createProviderSubmission,
  getProviderBooking,
  listProviderBookings,
  rejectProviderBooking,
} from "./provider-service.js";

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const fail = (code: string, message: string, status: number): Response =>
  json({ error: { code, message } }, status);

const empty = (status: number, headers: HeadersInit): Response => new Response(null, { status, headers });

const methodNotAllowed = (allowedMethods: string[]): Response =>
  new Response(
    JSON.stringify({
      error: {
        code: "method_not_allowed",
        message: `Method not allowed. Use ${allowedMethods.join(" or ")}.`,
      },
    }),
    {
      status: 405,
      headers: {
        allow: allowedMethods.join(", "),
        "content-type": "application/json",
      },
    },
  );

const options = (allowedMethods: string[]): Response =>
  empty(204, {
    allow: allowedMethods.join(", "),
  });

const head = (response: Response): Response => {
  const headers = new Headers(response.headers);
  const contentLength = headers.get("content-length");
  if (contentLength !== null) headers.set("content-length", contentLength);
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

async function handleReadRoute(method: string, handler: () => Promise<Response> | Response): Promise<Response> {
  const allowedMethods = ["GET", "HEAD", "OPTIONS"];
  if (method === "OPTIONS") return options(allowedMethods);
  if (method === "HEAD") return head(await handler());
  if (method === "GET") return await handler();
  return methodNotAllowed(allowedMethods);
}

async function handleWriteRoute(method: string, handler: () => Promise<Response> | Response): Promise<Response> {
  const allowedMethods = ["POST", "OPTIONS"];
  if (method === "OPTIONS") return options(allowedMethods);
  if (method === "POST") return await handler();
  return methodNotAllowed(allowedMethods);
}

async function parseJsonBody<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return fail("invalid_request", "Request body must be valid JSON", 400);
  }
}

async function handleQuotes(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody<Partial<QuoteRequest>>(request);
  if (body instanceof Response) return body;

  const { origin_zone_id, destination_zone_id, package_weight_kg } = body;
  if (typeof origin_zone_id !== "string" || typeof destination_zone_id !== "string") {
    return fail("invalid_request", "origin_zone_id and destination_zone_id are required", 400);
  }
  if (typeof package_weight_kg !== "number" || !(package_weight_kg > 0)) {
    return fail("invalid_request", "package_weight_kg must be a positive number", 400);
  }

  const result = await createQuotes(env.itafika, { origin_zone_id, destination_zone_id, package_weight_kg });
  if (!result.ok) return fail("not_found", "One or both zone IDs are unknown", 404);
  return json(result.body);
}

interface DeliveryCreateBody {
  quote_id?: unknown;
  shop_order_ref?: unknown;
  shop_handoff_url?: unknown;
  sender?: unknown;
  recipient?: unknown;
  package_description?: unknown;
  instructions?: unknown;
  alternate_collector?: unknown;
}

async function handleCreateDelivery(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody<DeliveryCreateBody>(request);
  if (body instanceof Response) return body;

  if (typeof body.quote_id !== "string" || !isQuoteId(body.quote_id)) {
    return fail("invalid_request", "quote_id must be a valid quote identifier", 400);
  }

  const shopOrderRef = parseShopOrderRef(body.shop_order_ref);
  if (shopOrderRef === null) {
    return fail("invalid_request", "shop_order_ref is required", 400);
  }

  const requestBody = {
    quote_id: body.quote_id,
    shop_order_ref: shopOrderRef,
  } as const;

  const deliveryRequest = {
    ...requestBody,
  } as {
    quote_id: string;
    shop_order_ref: string;
    shop_handoff_url?: string;
    sender?: { name: string; phone: string; id_number?: string };
    recipient?: { name: string; phone: string; id_number?: string };
    package_description?: string;
    instructions?: string;
    alternate_collector?: { name: string; phone: string; id_number?: string };
  };

  const handoffUrl = parseShopHandoffUrl(body.shop_handoff_url);
  if (body.shop_handoff_url !== undefined && handoffUrl === null) {
    return fail("invalid_request", "shop_handoff_url must be a valid URL", 400);
  }
  if (handoffUrl !== null) deliveryRequest.shop_handoff_url = handoffUrl;

  if (body.sender !== undefined) {
    const sender = parseContact(body.sender);
    if (sender === null) return fail("invalid_request", "sender.name and sender.phone must be valid", 400);
    deliveryRequest.sender = sender;
  }

  if (body.recipient !== undefined) {
    const recipient = parseContact(body.recipient);
    if (recipient === null) return fail("invalid_request", "recipient.name and recipient.phone must be valid", 400);
    deliveryRequest.recipient = recipient;
  }

  if (body.package_description !== undefined) {
    const packageDescription = parsePackageDescription(body.package_description);
    if (packageDescription === null) {
      return fail("invalid_request", "package_description must be a non-empty string up to 500 characters", 400);
    }
    deliveryRequest.package_description = packageDescription;
  }

  if (body.instructions !== undefined) {
    const instructions = parseInstructions(body.instructions);
    if (instructions === null) {
      return fail("invalid_request", "instructions must be a non-empty string up to 500 characters", 400);
    }
    deliveryRequest.instructions = instructions;
  }

  if (body.alternate_collector !== undefined) {
    const alternateCollector = parseContact(body.alternate_collector);
    if (alternateCollector === null) {
      return fail("invalid_request", "alternate_collector.name and alternate_collector.phone must be valid", 400);
    }
    deliveryRequest.alternate_collector = alternateCollector;
  }

  const delivery = await bookDelivery(env.itafika, deliveryRequest);
  if (!delivery) return fail("not_found", "The quote_id is unknown or has expired", 404);
  return json(delivery, 201);
}

const TRACKING_EVENT_STATUSES = new Set([
  "booking_requested",
  "booking_confirmed",
  "package_picked",
  "in_transit",
  "at_sorting_hub",
  "ready_for_pickup",
  "delivered",
  "delivery_cancelled",
]);

interface TrackingEventBody {
  status?: unknown;
  note?: unknown;
}

async function handleCreateTrackingEvent(request: Request, env: Env, trackingId: string): Promise<Response> {
  const body = await parseJsonBody<TrackingEventBody>(request);
  if (body instanceof Response) return body;

  if (typeof body.status !== "string" || !TRACKING_EVENT_STATUSES.has(body.status)) {
    return fail("invalid_request", "status is required", 400);
  }

  const event = { status: body.status } as { status: string; note?: string };
  if (body.note !== undefined) {
    const note = parseTrackingNote(body.note);
    if (note === null) {
      return fail("invalid_request", "note must be a non-empty string up to 500 characters", 400);
    }
    event.note = note;
  }

  const result = await appendTrackingEvent(
    env.itafika,
    trackingId,
    event as never,
    new Date().toISOString(),
  );
  if (result === "not_found") return fail("not_found", "Unknown tracking ID", 404);
  if (result === "invalid_transition") return fail("invalid_status_transition", "tracking status cannot move backwards", 409);
  return json(result, 201);
}

const SUBMISSION_TARGETS = new Set<SubmissionTarget>(["rates", "zones", "providers", "modes"]);
const SUBMISSION_OPERATIONS = new Set<"create" | "update">(["create", "update"]);
const SUBMISSION_STATUSES = new Set<SubmissionStatus>(["pending", "approved", "rejected"]);
const PROVIDER_BOOKING_STATUSES = new Set(["pending", "accepted", "rejected", "expired"]);
const PROVIDER_BOOKING_EVENT_STATUSES = new Set([
  "package_picked",
  "in_transit",
  "at_sorting_hub",
  "ready_for_pickup",
  "delivered",
]);

interface SubmissionBody {
  target?: unknown;
  operation?: unknown;
  payload?: unknown;
  source?: unknown;
  submitted_by?: unknown;
}

async function handleCreateSubmission(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody<SubmissionBody>(request);
  if (body instanceof Response) return body;

  if (typeof body.target !== "string" || !SUBMISSION_TARGETS.has(body.target as SubmissionTarget)) {
    return fail("invalid_request", "target must be one of rates, zones, providers, modes", 400);
  }
  if (typeof body.operation !== "string" || !SUBMISSION_OPERATIONS.has(body.operation as "create" | "update")) {
    return fail("invalid_request", "operation must be create or update", 400);
  }
  if (typeof body.payload !== "object" || body.payload === null) {
    return fail("invalid_request", "payload must be an object", 400);
  }
  if (typeof body.source !== "string" || body.source.trim().length === 0) {
    return fail("invalid_request", "source is required", 400);
  }
  if (typeof body.submitted_by !== "string" || body.submitted_by.trim().length === 0) {
    return fail("invalid_request", "submitted_by is required", 400);
  }

  const input: SubmissionInput = {
    target: body.target as SubmissionTarget,
    operation: body.operation as "create" | "update",
    payload: body.payload,
    source: body.source,
    submitted_by: body.submitted_by,
  };
  const submission = await createSubmission(env.itafika, input, new Date().toISOString());
  if (!submission) return fail("invalid_request", "payload is not valid for the given target", 400);
  return json(submission, 201);
}

async function handleProviderCreateSubmission(request: Request, env: Env): Promise<Response> {
  const account = await authenticateProvider(env.itafika, request);
  if (!account) return fail("unauthorized", "valid provider credentials are required", 401);

  const body = await parseJsonBody<SubmissionBody>(request);
  if (body instanceof Response) return body;

  if (body.target !== "rates") {
    return fail("invalid_request", "provider submissions are limited to rates", 400);
  }

  if (typeof body.operation !== "string" || !SUBMISSION_OPERATIONS.has(body.operation as "create" | "update")) {
    return fail("invalid_request", "operation must be create or update", 400);
  }
  if (typeof body.payload !== "object" || body.payload === null) {
    return fail("invalid_request", "payload must be an object", 400);
  }
  if (typeof body.source !== "string" || body.source.trim().length === 0) {
    return fail("invalid_request", "source is required", 400);
  }

  const payload = body.payload as Record<string, unknown>;
  if (payload.provider_id !== account.provider_id) {
    return fail("forbidden", "provider cannot submit another provider's data", 403);
  }

  const submission = await createProviderSubmission(
    env.itafika,
    account,
    {
      target: "rates",
      operation: body.operation as "create" | "update",
      payload: body.payload,
      source: body.source,
      submitted_by: account.display_name,
    },
    new Date().toISOString(),
  );
  if (!submission) return fail("invalid_request", "payload is not valid for the given target", 400);
  return json(submission, 201);
}

async function noteFrom(request: Request): Promise<string | null> {
  const body = await parseJsonBody<{ note?: unknown }>(request);
  if (body instanceof Response) return null;
  return typeof body.note === "string" ? body.note : null;
}

async function handleReviewSubmission(
  request: Request,
  env: Env,
  id: string,
  action: "approve" | "reject",
): Promise<Response> {
  const moderator = authenticateModerator(env, request);
  if (!moderator) return fail("unauthorized", "valid moderator credentials are required", 401);

  const note = await noteFrom(request);
  if (action === "reject" && (note === null || note.trim().length === 0)) {
    return fail("invalid_request", "reject requires a non-empty note", 400);
  }

  const now = new Date().toISOString();
  const result =
    action === "approve"
      ? await approveSubmission(env.itafika, id, moderator, note, now)
      : await rejectSubmission(env.itafika, id, moderator, note, now);

  if (!result.ok) {
    if (result.reason === "not_found") return fail("not_found", "Unknown submission", 404);
    if (result.reason === "already_reviewed") return fail("already_reviewed", "submission is not pending", 409);
    if (result.reason === "row_exists") return fail("row_exists", "submission target already exists", 409);
    if (result.reason === "row_missing") return fail("row_missing", "submission target does not exist", 404);
    return fail("invalid_request", "submission payload is not applicable", 400);
  }
  return json(result.submission);
}

async function handleSubmissionDetail(request: Request, env: Env, id: string): Promise<Response> {
  const moderator = authenticateModerator(env, request);
  if (!moderator) return fail("unauthorized", "valid moderator credentials are required", 401);

  const detail = await getSubmissionDetails(env.itafika, id);
  if (!detail) return fail("not_found", "Unknown submission", 404);
  return json(detail);
}

async function handleChangeLog(request: Request, env: Env, url: URL): Promise<Response> {
  const moderator = authenticateModerator(env, request);
  if (!moderator) return fail("unauthorized", "valid moderator credentials are required", 401);

  const target = url.searchParams.get("target");
  if (target !== null && !SUBMISSION_TARGETS.has(target as SubmissionTarget)) {
    return fail("invalid_request", "target must be one of rates, zones, providers, modes", 400);
  }
  const rowKey = url.searchParams.get("row_key") ?? undefined;
  const limit = clampLimit(url.searchParams.get("limit"));
  const changes = await getChangeLog(env.itafika, {
    target: (target as SubmissionTarget | null) ?? undefined,
    row_key: rowKey,
    limit,
  });
  return json({ changes });
}

async function handleProviderMe(request: Request, env: Env): Promise<Response> {
  const account = await authenticateProvider(env.itafika, request);
  if (!account) return fail("unauthorized", "valid provider credentials are required", 401);
  return json({
    account: {
      id: account.id,
      provider_id: account.provider_id,
      display_name: account.display_name,
      status: account.status,
    },
  });
}

async function handleProviderBookings(request: Request, env: Env, url: URL): Promise<Response> {
  const account = await authenticateProvider(env.itafika, request);
  if (!account) return fail("unauthorized", "valid provider credentials are required", 401);

  const statusParam = url.searchParams.get("status");
  if (statusParam !== null && !PROVIDER_BOOKING_STATUSES.has(statusParam)) {
    return fail("invalid_request", "status must be pending, accepted, rejected, or expired", 400);
  }

  const bookings = await listProviderBookings(
    env.itafika,
    account.provider_id,
    statusParam === null ? undefined : (statusParam as "pending" | "accepted" | "rejected" | "expired"),
  );
  return json({ bookings });
}

async function handleProviderBookingDetail(request: Request, env: Env, id: string): Promise<Response> {
  const account = await authenticateProvider(env.itafika, request);
  if (!account) return fail("unauthorized", "valid provider credentials are required", 401);

  const booking = await getProviderBooking(env.itafika, account.provider_id, id);
  if (!booking) return fail("not_found", "Unknown booking", 404);
  return json({ booking: booking.booking, delivery: booking.delivery, quote: booking.quote });
}

async function handleProviderBookingAccept(request: Request, env: Env, id: string): Promise<Response> {
  const account = await authenticateProvider(env.itafika, request);
  if (!account) return fail("unauthorized", "valid provider credentials are required", 401);

  const result = await acceptProviderBooking(env.itafika, account.provider_id, id, account.id, new Date().toISOString());
  if (!result.ok) {
    if (result.reason === "not_found") return fail("not_found", "Unknown booking", 404);
    return fail("invalid_task_state", "booking is not pending", 409);
  }
  return json(result.booking);
}

async function handleProviderBookingReject(request: Request, env: Env, id: string): Promise<Response> {
  const account = await authenticateProvider(env.itafika, request);
  if (!account) return fail("unauthorized", "valid provider credentials are required", 401);

  const note = await noteFrom(request);
  if (note === null || note.trim().length === 0) {
    return fail("invalid_request", "reject requires a non-empty note", 400);
  }

  const result = await rejectProviderBooking(env.itafika, account.provider_id, id, account.id, new Date().toISOString(), note);
  if (!result.ok) {
    if (result.reason === "not_found") return fail("not_found", "Unknown booking", 404);
    return fail("invalid_task_state", "booking is not pending", 409);
  }
  return json(result.booking);
}

async function handleProviderBookingEvent(request: Request, env: Env, id: string): Promise<Response> {
  const account = await authenticateProvider(env.itafika, request);
  if (!account) return fail("unauthorized", "valid provider credentials are required", 401);

  const body = await parseJsonBody<{ status?: unknown; note?: unknown }>(request);
  if (body instanceof Response) return body;
  if (typeof body.status !== "string" || !PROVIDER_BOOKING_EVENT_STATUSES.has(body.status)) {
    return fail("invalid_request", "status must be a physical tracking status", 400);
  }

  const note = typeof body.note === "string" ? body.note : undefined;
  const result = await appendProviderBookingEvent(
    env.itafika,
    account.provider_id,
    id,
    new Date().toISOString(),
    body.status as "package_picked" | "in_transit" | "at_sorting_hub" | "ready_for_pickup" | "delivered",
    note,
  );
  if (!result.ok) {
    if (result.reason === "not_found") return fail("not_found", "Unknown booking", 404);
    if (result.reason === "invalid_task_state") return fail("invalid_task_state", "booking must be accepted first", 409);
    return fail("invalid_status_transition", "tracking status cannot move backwards", 409);
  }
  return json(result.booking);
}

async function handleExport(request: Request, env: Env): Promise<Response> {
  return await handleReadRoute(request.method, async () => {
    const data = await exportReferenceData(env.itafika, new Date().toISOString());
    return json(data);
  });
}

async function handleExportLatest(request: Request, env: Env): Promise<Response> {
  return await handleReadRoute(request.method, async () => {
    const snapshot = await readReferenceExportSnapshot(env.reference_exports);
    if (!snapshot) return fail("export_unavailable", "No export snapshot is available yet", 503);
    return json(snapshot);
  });
}

async function handleModeratorListSubmissions(request: Request, env: Env, url: URL): Promise<Response> {
  const moderator = authenticateModerator(env, request);
  if (!moderator) return fail("unauthorized", "valid moderator credentials are required", 401);

  const statusParam = url.searchParams.get("status");
  if (statusParam !== null && !SUBMISSION_STATUSES.has(statusParam as SubmissionStatus)) {
    return fail("invalid_request", "status must be pending, approved, or rejected", 400);
  }

  const targetParam = url.searchParams.get("target");
  if (targetParam !== null && !SUBMISSION_TARGETS.has(targetParam as SubmissionTarget)) {
    return fail("invalid_request", "target must be one of rates, zones, providers, modes", 400);
  }

  const submissions = await listSubmissions(env.itafika, statusParam as SubmissionStatus | undefined, targetParam as SubmissionTarget | undefined);
  return json({ submissions });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const { method } = request;

    try {
      if (pathname === "/v1/zones") {
        return await handleReadRoute(method, async () => {
          const type = url.searchParams.get("type") as ZoneType | null;
          const town = url.searchParams.get("town");
          const county = url.searchParams.get("county");
          const zones = await listZones(
            env.itafika,
            { type: type ?? undefined, town: town ?? undefined, county: county ?? undefined },
            clampLimit(url.searchParams.get("limit")),
          );
          return json({ zones });
        });
      }

      if (pathname === "/v1/zones/search") {
        return await handleReadRoute(method, async () => {
          const q = url.searchParams.get("q");
          if (!q) return fail("invalid_request", "query parameter q is required", 400);
          const zones = await searchZones(env.itafika, q, clampLimit(url.searchParams.get("limit")));
          return json({ zones });
        });
      }

      if (pathname === "/v1/freshness") {
        return await handleReadRoute(method, async () => {
          const freshness = await listFreshness(env.itafika);
          return json({ freshness });
        });
      }

      if (pathname === "/v1/modes") {
        return await handleReadRoute(method, async () => {
          const modes = await listModes(env.itafika);
          return json({ modes });
        });
      }

      if (pathname === "/v1/options") {
        return await handleReadRoute(method, async () => {
          const originZoneId = url.searchParams.get("origin_zone_id");
          const destinationTown = url.searchParams.get("destination_town");
          if (!originZoneId || !destinationTown) {
            return fail("invalid_request", "origin_zone_id and destination_town are required", 400);
          }
          const mode = url.searchParams.get("mode") as ProviderType | null;
          const result = await listOptions(env.itafika, originZoneId, destinationTown, mode ?? undefined);
          return json(result);
        });
      }

      if (pathname === "/v1/quotes") {
        return await handleWriteRoute(method, async () => await handleQuotes(request, env));
      }

      if (pathname === "/v1/deliveries") {
        return await handleWriteRoute(method, async () => await handleCreateDelivery(request, env));
      }

      if (pathname === "/v1/export") {
        return await handleReadRoute(method, async () => await handleExport(request, env));
      }

      if (pathname === "/v1/export/latest") {
        return await handleReadRoute(method, async () => await handleExportLatest(request, env));
      }

      if (pathname === "/v1/submissions") {
        if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
          if (method === "OPTIONS") return options(["GET", "HEAD", "POST", "OPTIONS"]);
          return method === "HEAD"
            ? head(await handleModeratorListSubmissions(request, env, url))
            : await handleModeratorListSubmissions(request, env, url);
        }
        if (method === "POST") return await handleCreateSubmission(request, env);
        return methodNotAllowed(["GET", "HEAD", "POST", "OPTIONS"]);
      }

      const submissionDetail = pathname.match(/^\/v1\/submissions\/([^/]+)$/);
      if (submissionDetail) {
        return await handleReadRoute(method, async () => await handleSubmissionDetail(request, env, decodeURIComponent(submissionDetail[1]!)));
      }

      const review = pathname.match(/^\/v1\/submissions\/([^/]+)\/(approve|reject)$/);
      if (review) {
        return await handleWriteRoute(method, async () =>
          await handleReviewSubmission(request, env, decodeURIComponent(review[1]!), review[2] as "approve" | "reject"),
        );
      }

      if (pathname === "/v1/change-log") {
        return await handleReadRoute(method, async () => await handleChangeLog(request, env, url));
      }

      if (pathname === "/v1/provider/me") {
        return await handleReadRoute(method, async () => await handleProviderMe(request, env));
      }

      if (pathname === "/v1/provider/submissions") {
        return await handleWriteRoute(method, async () => await handleProviderCreateSubmission(request, env));
      }

      if (pathname === "/v1/provider/bookings") {
        return await handleReadRoute(method, async () => await handleProviderBookings(request, env, url));
      }

      const providerBookingDetail = pathname.match(/^\/v1\/provider\/bookings\/([^/]+)$/);
      if (providerBookingDetail) {
        return await handleReadRoute(method, async () =>
          await handleProviderBookingDetail(request, env, decodeURIComponent(providerBookingDetail[1]!)),
        );
      }

      const providerBookingAction = pathname.match(/^\/v1\/provider\/bookings\/([^/]+)\/(accept|reject|events)$/);
      if (providerBookingAction) {
        const bookingId = decodeURIComponent(providerBookingAction[1]!);
        const action = providerBookingAction[2]!;
        if (action === "accept") {
          return await handleWriteRoute(method, async () => await handleProviderBookingAccept(request, env, bookingId));
        }
        if (action === "reject") {
          return await handleWriteRoute(method, async () => await handleProviderBookingReject(request, env, bookingId));
        }
        return await handleWriteRoute(method, async () => await handleProviderBookingEvent(request, env, bookingId));
      }

      const track = pathname.match(/^\/v1\/deliveries\/([^/]+)\/track$/);
      if (track) {
        return await handleReadRoute(method, async () => {
          const trackingId = decodeURIComponent(track[1]!);
          if (!isTrackingId(trackingId)) {
            return fail("invalid_request", "tracking_id must be a valid tracking identifier", 400);
          }
          const result = await trackDelivery(env.itafika, trackingId);
          if (!result) return fail("not_found", "Unknown tracking ID", 404);
          return json(result);
        });
      }

      const events = pathname.match(/^\/v1\/deliveries\/([^/]+)\/events$/);
      if (events) {
        return await handleWriteRoute(method, async () => {
          const trackingId = decodeURIComponent(events[1]!);
          if (!isTrackingId(trackingId)) {
            return fail("invalid_request", "tracking_id must be a valid tracking identifier", 400);
          }
          return await handleCreateTrackingEvent(request, env, trackingId);
        });
      }

      return env.ASSETS.fetch(request);
    } catch {
      return fail("internal_error", "Unexpected error", 500);
    }
  },
  async scheduled(controller, env, ctx): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const generatedAt = new Date(controller.scheduledTime ?? Date.now()).toISOString();
        const snapshot = await exportReferenceData(env.itafika, generatedAt);
        await writeReferenceExportSnapshot(
          env.reference_exports,
          snapshot,
          referenceExportArchiveKey(safeUtcTimestampKey(generatedAt)),
        );
        await runDailyMaintenance(env.itafika, generatedAt);
      })(),
    );
  },
} satisfies ExportedHandler<Env>;

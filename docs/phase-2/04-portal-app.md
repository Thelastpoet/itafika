# 04 - Portal App Shell and Shared UI

Purpose: add one hosted UI for contribution, moderation, and provider workflows.

## Files to Add

```text
apps/portal/
  package.json
  index.html
  tsconfig.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    api.ts
    routes/
      ContributeHome.tsx
      ContributeRate.tsx
      ContributeZone.tsx
      ContributeProvider.tsx
      ContributeMode.tsx
      ContributionSuccess.tsx
      ModerateQueue.tsx
      ModerateSubmission.tsx
      ModerateChangeLog.tsx
      ProviderDashboard.tsx
      ProviderRateSubmission.tsx
      ProviderBookings.tsx
      ProviderBookingDetail.tsx
```

## Package Setup

`apps/portal/package.json` starts as:

```json
{
  "name": "@itafika/portal",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite --host 127.0.0.1",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Install dependencies:

```bash
pnpm --filter @itafika/portal add react react-dom lucide-react
pnpm --filter @itafika/portal add -D typescript vite @vitejs/plugin-react vitest @types/react @types/react-dom
```

## Worker Static Assets

In `packages/worker/wrangler.jsonc`, add:

```jsonc
"assets": {
  "directory": "../../apps/portal/dist",
  "binding": "ASSETS",
  "not_found_handling": "single-page-application",
  "run_worker_first": ["/v1/*"]
}
```

In `packages/worker/src/index.ts`:

- [x] Keep all `/v1/*` routes in the Worker.
- [x] After API routing, return `env.ASSETS.fetch(request)` for non-API paths.
- [x] Do not add CORS for portal routes; app and API are same-origin.

## Contribution Routes

- [x] `/contribute`
- [x] `/contribute/rate`
- [x] `/contribute/zone`
- [x] `/contribute/provider`
- [x] `/contribute/mode`
- [x] `/contribute/success/:submissionId`

Controls:

- [x] Typed forms only, no raw JSON textarea.
- [x] Select controls for enum fields.
- [x] Number inputs for numeric fields.
- [x] Field-level validation messages.
- [x] No phone or email fields.
- [x] Successful submit shows submission id and status.

## Moderator Routes

- [x] `/moderate`
- [x] `/moderate/submissions/:id`
- [x] `/moderate/change-log`

Rules:

- [x] Prompt for moderator token.
- [x] Store token in React memory/session state only.
- [x] Do not store moderator token in local storage.
- [x] Queue has status and target filters.
- [x] Detail page shows proposed payload, current row, source, submitter, submitted time, diff, approve action, reject action.

## Provider Routes

- [x] `/provider`
- [x] `/provider/submissions/rate`
- [x] `/provider/bookings`
- [x] `/provider/bookings/:id`

Rules:

- [x] Prompt for provider token.
- [x] Store token in React memory/session state only.
- [x] Do not store provider token in local storage.
- [x] Dashboard links to rate submission and bookings.
- [x] Booking detail has accept/reject and tracking update controls.

## API Helper

`apps/portal/src/api.ts` must expose:

- [x] `createSubmission(input)`
- [x] `listSubmissions(token, filters)`
- [x] `getSubmission(token, id)`
- [x] `approveSubmission(token, id, note?)`
- [x] `rejectSubmission(token, id, note)`
- [x] `listChangeLog(token, filters)`
- [x] `providerMe(token)`
- [x] `providerCreateSubmission(token, input)`
- [x] `providerListBookings(token, status?)`
- [x] `providerGetBooking(token, id)`
- [x] `providerAcceptBooking(token, id)`
- [x] `providerRejectBooking(token, id, note)`
- [x] `providerAppendTrackingEvent(token, id, input)`

## Tests

- [x] Portal builds with `pnpm --filter @itafika/portal build`.
- [x] Portal typechecks with `pnpm --filter @itafika/portal typecheck`.
- [x] Form validation tests cover required fields.
- [x] API helper tests cover auth header inclusion.

## Exit Criteria

- [x] Portal serves from Worker static assets.
- [x] Contribution flow can create a pending submission.
- [x] Moderator flow can approve/reject.
- [x] Provider flow can authenticate once Track 05 exists.

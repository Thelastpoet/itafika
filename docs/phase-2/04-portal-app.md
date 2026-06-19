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

- [ ] Keep all `/v1/*` routes in the Worker.
- [ ] After API routing, return `env.ASSETS.fetch(request)` for non-API paths.
- [ ] Do not add CORS for portal routes; app and API are same-origin.

## Contribution Routes

- [ ] `/contribute`
- [ ] `/contribute/rate`
- [ ] `/contribute/zone`
- [ ] `/contribute/provider`
- [ ] `/contribute/mode`
- [ ] `/contribute/success/:submissionId`

Controls:

- [ ] Typed forms only, no raw JSON textarea.
- [ ] Select controls for enum fields.
- [ ] Number inputs for numeric fields.
- [ ] Field-level validation messages.
- [ ] No phone or email fields.
- [ ] Successful submit shows submission id and status.

## Moderator Routes

- [ ] `/moderate`
- [ ] `/moderate/submissions/:id`
- [ ] `/moderate/change-log`

Rules:

- [ ] Prompt for moderator token.
- [ ] Store token in React memory/session state only.
- [ ] Do not store moderator token in local storage.
- [ ] Queue has status and target filters.
- [ ] Detail page shows proposed payload, current row, source, submitter, submitted time, diff, approve action, reject action.

## Provider Routes

- [ ] `/provider`
- [ ] `/provider/submissions/rate`
- [ ] `/provider/bookings`
- [ ] `/provider/bookings/:id`

Rules:

- [ ] Prompt for provider token.
- [ ] Store token in React memory/session state only.
- [ ] Do not store provider token in local storage.
- [ ] Dashboard links to rate submission and bookings.
- [ ] Booking detail has accept/reject and tracking update controls.

## API Helper

`apps/portal/src/api.ts` must expose:

- [ ] `createSubmission(input)`
- [ ] `listSubmissions(token, filters)`
- [ ] `getSubmission(token, id)`
- [ ] `approveSubmission(token, id, note?)`
- [ ] `rejectSubmission(token, id, note)`
- [ ] `listChangeLog(token, filters)`
- [ ] `providerMe(token)`
- [ ] `providerCreateSubmission(token, input)`
- [ ] `providerListBookings(token, status?)`
- [ ] `providerGetBooking(token, id)`
- [ ] `providerAcceptBooking(token, id)`
- [ ] `providerRejectBooking(token, id, note)`
- [ ] `providerAppendTrackingEvent(token, id, input)`

## Tests

- [ ] Portal builds with `pnpm --filter @itafika/portal build`.
- [ ] Portal typechecks with `pnpm --filter @itafika/portal typecheck`.
- [ ] Form validation tests cover required fields.
- [ ] API helper tests cover auth header inclusion.

## Exit Criteria

- [ ] Portal serves from Worker static assets.
- [ ] Contribution flow can create a pending submission.
- [ ] Moderator flow can approve/reject.
- [ ] Provider flow can authenticate once Track 05 exists.

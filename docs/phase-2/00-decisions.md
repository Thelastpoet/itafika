# 00 - Locked Decisions

Read this before coding any Phase 2 track.

## Decisions

| Area | Phase 2 decision |
| --- | --- |
| Submission `create` | Must fail with `409 row_exists` when the target row already exists. |
| Submission `update` | Must fail with `404 row_missing` when the target row does not exist. |
| Moderator auth | Bearer token mapped to moderator id through required Worker secret `MODERATOR_TOKENS`. |
| Provider auth | Invite-only provider bearer token. Store only SHA-256 token hashes in D1. |
| Contributor contact | Do not collect contributor phone/email in v1. `submitted_by` is a display label only. |
| Product boundary | Itafika is a delivery orchestration API/control plane. Shops own customer/order/contact data. Providers handle fulfillment. |
| Frontend | One React + Vite + TypeScript SPA at `apps/portal`, served by the existing Worker through Static Assets. |
| API/frontend origin | Same origin. `/v1/*` routes run Worker code; other paths serve portal assets. |
| Export storage | Private R2 bucket bound as `reference_exports`; public access through Worker routes only. |
| Export format | JSON only in Phase 2. |
| Export cadence | Daily at `02:10 UTC` through `triggers.crons = ["10 2 * * *"]`. |
| Provider confirmation | Public tracking statuses expand with `booking_requested`, `booking_confirmed`, and `delivery_cancelled`. |
| Rejected/expired task | Set delivery to `delivery_cancelled` and append a `delivery_cancelled` tracking event. |
| Delivery booking data | Active delivery booking stores `shop_order_ref`, optional `shop_handoff_url`, route/provider/quote/task/status metadata, and timestamps. |
| Legacy contact fields | Existing sender/recipient/instruction columns are compatibility data. Phase 2 moves active flows away from them and excludes them from provider portal responses. |
| D1 source of truth | D1 is authoritative for reference data after Phase 2 migrations. |
| Provider portal scope | Build only route/rate submission, booking review, accept/reject, and tracking update. |

## Data Classification

| Data | Classification | Public export | Retention |
| --- | --- | --- | --- |
| `zones`, `modes`, `providers`, `rates`, `freshness` | Reference data | Yes | Indefinite |
| `change_log` | Reference provenance | No in v1 export | Indefinite |
| `submissions.payload` | Pending reference proposal | Private | 365 days |
| `submissions.submitted_by` | Private operational metadata | Private | Redact after 365 days |
| `quotes` | Orchestration data | Private | Delete unused expired rows after 7 days |
| `deliveries.shop_order_ref`, `shop_handoff_url`, provider/status fields | Orchestration data | Private | Retain for operational audit |
| legacy `deliveries.sender_*`, `recipient_*`, `alternate_collector_*`, `instructions`, `package_description` | Legacy compatibility data | Private | Move out of active flow and redact during cleanup |
| `tracking_events.note` | Operational note | Private | Keep provider/customer-specific details in shop/provider systems |
| `provider_accounts.token_hash` | Credential metadata | Private | Until disabled plus 90 days |
| `provider_booking_tasks` | Provider task data | Private | Retain for operational audit |

Terminal delivery states are `delivered` and `delivery_cancelled`.

## External References Checked

- Cloudflare Cron Triggers and `scheduled()` handler: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Wrangler `triggers.crons`: https://developers.cloudflare.com/workers/wrangler/configuration/#triggers
- Workers Static Assets config: https://developers.cloudflare.com/workers/static-assets/binding/
- Worker secrets and `secrets.required`: https://developers.cloudflare.com/workers/configuration/secrets/
- D1 prepared statements: https://developers.cloudflare.com/d1/worker-api/prepared-statements/
- R2 `put()` from Workers: https://developers.cloudflare.com/r2/objects/upload-objects/
- ODPC registration: https://www.odpc.go.ke/data-protection-compliance/
- Data Protection General Regulations, 2021: https://www.odpc.go.ke/wp-content/uploads/2024/03/THE-DATA-PROTECTION-GENERAL-REGULATIONS-2021-1.pdf

## Checklist

- [x] Confirm implementation PR follows these decisions.
- [x] If implementation needs a different decision, write an ADR before coding the change.

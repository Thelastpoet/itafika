# Architecture Decision Records (ADRs)

An ADR captures a single significant decision: the context, the options considered, the choice, and its consequences. They exist so the *why* behind Itafika outlives the conversations that produced it.

Per [GOVERNANCE.md](../../GOVERNANCE.md), any change to the spec is accompanied by an ADR. ADRs are immutable once accepted; to change a decision, write a new ADR that supersedes the old one and update the status below.

| # | Title | Status |
|---|-------|--------|
| [0001](0001-language-and-stack.md) | Use TypeScript and Cloudflare Workers | Accepted |
| [0002](0002-spec-first-monorepo.md) | Use a spec-first monorepo structure | Accepted |
| [0003](0003-datastore.md) | Use Cloudflare D1 for data storage | Accepted (partially superseded by 0023) |
| [0004](0004-license.md) | Use the MIT License | Accepted |
| [0006](0006-rename-shipments-to-deliveries.md) | Rename "shipment" to "delivery" | Accepted |
| [0007](0007-clarify-phase1-validation-and-reserved-fields.md) | Simplify validation and quote fields | Accepted |
| [0008](0008-expose-dataset-freshness.md) | Show data freshness in the API | Accepted |
| [0009](0009-define-worker-boundaries.md) | Organize Worker code by service boundaries | Accepted |
| [0010](0010-clarify-adapter-contract-vs-phase1-integration.md) | Define how adapters and the Worker interact | Accepted |
| [0011](0011-require-freshness-for-every-town.md) | Ensure all towns have freshness data | Accepted |
| [0012](0012-add-manual-tracking-event-updates.md) | Allow manual tracking updates | Accepted |
| [0013](0013-wire-worker-to-adapter-runtime.md) | Connect the Worker to adapters for quotes | Accepted |
| [0014](0014-route-booking-through-adapter-runtime.md) | Use adapters for bookings | Accepted |
| [0015](0015-tracking-update-model.md) | Simplify tracking as a single event log | Accepted |
| [0016](0016-surface-collection-point-and-type-on-quotes.md) | Show collection details on quotes | Accepted |
| [0017](0017-add-delivery-options-discovery-surface.md) | Add an endpoint to discover delivery options | Accepted |
| [0018](0018-capture-delivery-instructions-and-collection-identity.md) | Historical delivery-contact fields for Phase 1 compatibility | Accepted (active boundary superseded by 0025) |
| [0019](0019-transport-modes-as-a-registry.md) | Use a registry for transport modes | Accepted |
| [0020](0020-non-developer-data-contribution-via-form-to-pr.md) | Allow data updates via a web form | Superseded by 0023 |
| [0021](0021-reliability-score-is-asserted-not-measured.md) | Treat `reliability_score` as asserted, not measured | Accepted |
| [0022](0022-itafika-builds-the-provider-supply-layer.md) | Itafika builds the provider-side digital layer where none exists | Accepted |
| [0023](0023-data-lives-in-d1-not-git.md) | Data lives in D1; git holds code, not data (supersedes 0003, 0020) | Accepted |
| [0024](0024-data-classification-and-protection.md) | Reference export data classification | Accepted (partially superseded by 0025) |
| [0025](0025-delivery-orchestration-boundary.md) | Itafika is a delivery orchestration API/control plane | Accepted |

ADRs 0022-0025 are a related set that reframes Phase 2. 0022 establishes the provider
supply layer. 0023 moves the source of truth to D1 with online moderation, a change-log
for provenance, and an automated public export for openness. 0024 sets the reference-data
export boundary. 0025 defines Itafika as a delivery orchestration API/control plane where
shops own customer/order data, providers handle fulfillment, and Itafika stores
orchestration state.

ADRs 0016-0019 are a related set that evolved Itafika from a quoting engine into a
checkout-delivery layer. They are `Accepted` and implemented in the reference Worker
(modes registry, collection facts on quotes, and the `/v1/options` discovery surface).
ADR 0025 is the current delivery-orchestration boundary for Phase 2 booking.

## Format

Each ADR follows: **Context → Decision → Consequences**, with an explicit list of the options that were rejected and why.

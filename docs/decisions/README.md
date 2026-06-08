# Architecture Decision Records (ADRs)

An ADR captures a single significant decision: the context, the options considered, the choice, and its consequences. They exist so the *why* behind Itafika outlives the conversations that produced it.

Per [GOVERNANCE.md](../../GOVERNANCE.md), any change to the spec is accompanied by an ADR. ADRs are immutable once accepted — to change a decision, write a new ADR that supersedes the old one and update the status below.

| # | Title | Status |
|---|-------|--------|
| [0001](0001-language-and-stack.md) | TypeScript and Cloudflare Workers for the reference implementation | Accepted |
| [0002](0002-spec-first-monorepo.md) | Spec-first, clearly separated monorepo | Accepted |
| [0003](0003-datastore.md) | D1 as the reference datastore | Accepted |
| [0004](0004-license.md) | MIT license | Accepted |
| [0006](0006-rename-shipments-to-deliveries.md) | Rename the booking resource from "shipment" to "delivery" | Accepted |
| [0007](0007-clarify-phase1-validation-and-reserved-fields.md) | Clarify Phase 1 validation rules and reserved quote fields | Accepted |
| [0008](0008-expose-dataset-freshness.md) | Expose dataset freshness through the API | Accepted |
| [0009](0009-define-worker-boundaries.md) | Define Worker policy, validation, and service boundaries | Accepted |
| [0010](0010-clarify-adapter-contract-vs-phase1-integration.md) | Clarify adapter contract versus Phase 1 runtime integration | Accepted |

## Format

Each ADR follows: **Context → Decision → Consequences**, with an explicit list of the options that were rejected and why.

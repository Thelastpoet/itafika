# Phase 2 Spec Pack

**Status:** Ready for implementation  
**Last updated:** 2026-06-19  
**Goal:** make Phase 2 implementable track-by-track without another planning pass.

This folder is the implementation source for Phase 2. Treat each track as a spec-driven ticket pack: it names the files to touch, behavior to implement, tests to add, and exit criteria.

## Source Documents

- [ADR 0022 - provider-side digital layer](../decisions/0022-itafika-builds-the-provider-supply-layer.md)
- [ADR 0023 - D1 source of truth and public export](../decisions/0023-data-lives-in-d1-not-git.md)
- [ADR 0024 - data classification and protection](../decisions/0024-data-classification-and-protection.md)
- [ADR 0025 - delivery orchestration API/control plane](../decisions/0025-delivery-orchestration-boundary.md)
- [OpenAPI contract](../../spec/openapi.yaml)
- [Data schema rules](../../spec/data/SCHEMA.md)
- [Current roadmap](../next-phase.md)

## Track Order

Work in this order unless a PR is explicitly scoped to docs only.

- [ ] [00 - Locked decisions](00-decisions.md)
- [ ] [01 - Foundation checks](01-foundation-checks.md)
- [ ] [02 - Moderation backend](02-moderation-backend.md)
- [ ] [03 - Public export snapshot](03-export-snapshot.md)
- [ ] [04 - Portal app shell and shared UI](04-portal-app.md)
- [ ] [05 - Provider data portal](05-provider-data-portal.md)
- [ ] [06 - Provider booking confirmation](06-provider-booking-confirmation.md)
- [ ] [07 - Customer data boundary and compliance controls](07-retention-compliance.md)

## Implementation Rules

- Add new product/architecture decisions through ADRs.
- Keep every PR tied to one track where possible.
- Update docs in the same PR as behavior changes.
- Public export contains reference data only.
- Keep customer/order/contact data in the shop-owned system; use shop references and handoff URLs for orchestration.
- Provider portal scope stays within route/rate submission, booking review, accept/reject, and tracking update.
- Use `pnpm add` for dependency changes so `pnpm-lock.yaml` stays tool-generated.

## Progress Tracking

- Mark a checkbox `[x]` only in the PR that implements or verifies that item.
- Leave a checkbox `[ ]` when code exists but tests/docs are not complete.
- A track is complete only when every checklist item and exit criterion in that track is marked `[x]`.
- Mark later tracks complete after earlier required checks are green.

## Required Commands

Run before merge:

```bash
pnpm data:validate
pnpm typecheck
pnpm test
```

When `spec/openapi.yaml` changes:

```bash
pnpm gen:types
pnpm typecheck
pnpm test
```

When `packages/worker/wrangler.jsonc` changes:

```bash
pnpm --filter @itafika/worker exec wrangler types
pnpm typecheck
```

## Final Definition of Done

Phase 2 is done when:

- [ ] Non-developers can submit reference-data updates without GitHub.
- [ ] Moderators can approve and reject submissions online.
- [ ] Strict `create` and `update` moderation semantics are implemented.
- [ ] Approved reference data lives in D1 and is audited in `change_log`.
- [ ] Public reference-data JSON export is generated from reference tables only.
- [ ] Providers authenticate with invite tokens.
- [ ] Providers submit their own rates through moderation.
- [ ] Provider-backed bookings create provider-visible tasks.
- [ ] Providers accept or reject bookings.
- [ ] Provider confirmation/cancellation appears in public delivery status.
- [ ] Provider tracking updates appear in normal tracking history.
- [ ] Provider booking access is scoped to the assigned provider.
- [ ] Active delivery booking uses shop-owned references through `shop_order_ref` and optional `shop_handoff_url`.
- [ ] `pnpm data:validate`, `pnpm typecheck`, and `pnpm test` pass.
